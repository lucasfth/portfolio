import type { Lint } from "harper.js";

export interface GrammarIssue {
  text: string;
  kind: string;
  message: string;
  offset: number;
  length: number;
  suggestions: string[];
}

export function hasObviousGibberish(sentence: string): boolean {
  return sentence
    .split(/[^\p{L}\p{M}]+/u)
    .some((word) => /(\p{L})\1{2,}/iu.test(word));
}

export function summarizeHarperLints(lints: Lint[]): GrammarIssue[] {
  try {
    return lints.slice(0, 8).map((lint) => {
      const span = lint.span();
      const suggestions = lint.suggestions();
      try {
        return {
          text: lint.get_problem_text(),
          kind: lint.lint_kind(),
          message: lint.message(),
          offset: span.start,
          length: span.len(),
          suggestions: suggestions
            .slice(0, 3)
            .map((suggestion) => suggestion.get_replacement_text()),
        };
      } finally {
        span.free();
        for (const suggestion of suggestions) suggestion.free();
      }
    });
  } finally {
    for (const lint of lints) lint.free();
  }
}
