import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InferenceSession, Tensor } from "onnxruntime-web";

/**
 * Grammatical acceptability check. The model is
 * pszemraj/electra-small-discriminator-CoLA, trained on the Corpus of Linguistic
 * Acceptability, exported to ONNX and quantised to 8 bits (14 MB). It scores how likely a
 * sentence is to be acceptable English; word salad made of real words scores low.
 */
export const ACCEPTABLE_THRESHOLD = 0.55;
const MAX_TOKENS = 256;
const MODEL_DIR = path.join(process.cwd(), "lib/game/sentence-model");
const ORT_DIR = path.join(process.cwd(), "node_modules/onnxruntime-web/dist");

type Model = { ort: typeof import("onnxruntime-web"); session: InferenceSession; vocab: Map<string, number> };
let model: Promise<Model> | null = null;

function getModel(): Promise<Model> {
  model ??= (async () => {
    const ort = await import("onnxruntime-web");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmBinary = await readFile(path.join(ORT_DIR, "ort-wasm-simd-threaded.wasm"));
    const [bytes, vocabText] = await Promise.all([
      readFile(path.join(MODEL_DIR, "model_q8.onnx")),
      readFile(path.join(MODEL_DIR, "vocab.txt"), "utf8"),
    ]);
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
    const vocab = new Map(vocabText.split("\n").map((token, id) => [token, id] as const));
    return { ort, session, vocab };
  })().catch((error) => {
    model = null;
    throw error;
  });
  return model;
}

const isPunctuation = (char: string) => /[\p{P}\p{S}]/u.test(char) || /[!-/:-@[-`{-~]/u.test(char);

/** BERT uncased basic tokenizer: lowercase, strip accents, split on spaces and punctuation. */
function basicTokens(text: string): string[] {
  const clean = text.toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "");
  const tokens: string[] = [];
  let current = "";
  for (const char of clean) {
    if (/\s/u.test(char)) {
      if (current) tokens.push(current);
      current = "";
    } else if (isPunctuation(char)) {
      if (current) tokens.push(current);
      tokens.push(char);
      current = "";
    } else current += char;
  }
  if (current) tokens.push(current);
  return tokens;
}

/** Greedy longest-match WordPiece, as in BertTokenizer. */
export function tokenize(text: string, vocab: Map<string, number>): number[] {
  const unk = vocab.get("[UNK]")!;
  const ids = [vocab.get("[CLS]")!];
  for (const word of basicTokens(text)) {
    if (word.length > 100) {
      ids.push(unk);
      continue;
    }
    const pieces: number[] = [];
    let start = 0;
    while (start < word.length) {
      let end = word.length;
      let found: number | undefined;
      while (start < end) {
        const piece = (start > 0 ? "##" : "") + word.slice(start, end);
        found = vocab.get(piece);
        if (found !== undefined) break;
        end--;
      }
      if (found === undefined) {
        pieces.length = 0;
        pieces.push(unk);
        break;
      }
      pieces.push(found);
      start = end;
    }
    ids.push(...pieces);
  }
  return [...ids.slice(0, MAX_TOKENS - 1), vocab.get("[SEP]")!];
}

/** Probability (0 to 1) that the sentence is grammatically acceptable English. */
export async function sentenceScore(sentence: string): Promise<number> {
  const { ort, session, vocab } = await getModel();
  const ids = tokenize(sentence, vocab);
  const shape = [1, ids.length];
  const tensor = (values: number[]) => new ort.Tensor("int64", BigInt64Array.from(values, BigInt), shape);
  const feeds: Record<string, Tensor> = {
    input_ids: tensor(ids),
    attention_mask: tensor(ids.map(() => 1)),
    token_type_ids: tensor(ids.map(() => 0)),
  };
  const output = await session.run(feeds);
  const [bad, good] = Array.from(output[session.outputNames[0]].data as Float32Array);
  const max = Math.max(bad, good);
  const eGood = Math.exp(good - max);
  return eGood / (eGood + Math.exp(bad - max));
}

/**
 * compromise (rule-based part-of-speech tagger): at least one word must be able to act as a
 * verb. In-context tagging misses verbs such as "hit" in "the incident hit koala 3", so each
 * word is also tried after "they".
 */
export async function hasVerb(sentence: string): Promise<boolean> {
  const { default: nlp } = await import("compromise");
  const doc = nlp(sentence);
  if (doc.has("#Verb")) return true;
  const words = doc.terms().out("array") as string[];
  return words.some((word) => nlp(`they ${word.toLowerCase().replace(/[^a-z'-]/g, "")}`).verbs().length > 0);
}

export type SentenceVerdict = { ok: boolean; score: number; verb: boolean };

/**
 * A real sentence needs a word that can be a verb (rule-based) and must read as grammatical
 * English (classifier). The classifier alone accepts fragments such as "On Saturday 2026-10-10."
 */
export async function checkGrammar(sentence: string): Promise<SentenceVerdict> {
  const [verb, score] = await Promise.all([hasVerb(sentence), sentenceScore(sentence)]);
  return { ok: verb && score >= ACCEPTABLE_THRESHOLD, score, verb };
}

export const NOT_A_SENTENCE_MESSAGE =
  "Write a real English sentence. Word lists and scrambled word order do not count.";
