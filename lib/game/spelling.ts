import type { LocalLinter } from "harper.js";

let linter: Promise<LocalLinter> | null = null;

function getLinter(): Promise<LocalLinter> {
  linter ??= (async () => {
    const [{ LocalLinter, Dialect }, { binaryInlined }] = await Promise.all([
      import("harper.js"),
      import("harper.js/binaryInlined"),
    ]);
    const instance = new LocalLinter({ binary: binaryInlined, dialect: Dialect.American });
    await instance.setup();
    return instance;
  })().catch((error) => {
    linter = null;
    throw error;
  });
  return linter;
}

/** Words Harper does not recognise. The game only accepts real English words. */
export async function findMisspellings(sentence: string): Promise<string[]> {
  const lints = await (await getLinter()).lint(sentence, { language: "plaintext" });
  const words: string[] = [];
  for (const lint of lints) {
    const kind = lint.lint_kind();
    if (kind === "Spelling" || kind === "Typo") words.push(lint.get_problem_text());
    lint.free();
  }
  return [...new Set(words)];
}
