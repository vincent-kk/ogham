import type { LintIssue } from "../../../types/search.js";

const LINT_CODE = {
  UNBALANCED_PARENS: "UNBALANCED_PARENS",
  UNBALANCED_BRACKETS: "UNBALANCED_BRACKETS",
} as const;

const LINT_MESSAGE = {
  UNBALANCED_PARENS: "Unbalanced or mismatched parentheses '()' in query.",
  UNBALANCED_BRACKETS:
    "Unbalanced or mismatched square brackets '[]' in query.",
} as const;

/** Closer → expected opener, used to detect nesting mismatches. */
const PAIR = { ")": "(", "]": "[" } as const;

/** Build a single error issue for the given delimiter code. */
function issue(code: keyof typeof LINT_CODE): LintIssue {
  return {
    code: LINT_CODE[code],
    message: LINT_MESSAGE[code],
    severity: "error",
  };
}

/**
 * Validate that '()' and '[]' are balanced and correctly nested via a stack
 * (a closer must match the most recent opener type). Returns one error issue
 * on the first imbalance/mismatch, distinguishing parens from brackets, else [].
 */
export function checkParens(term: string): LintIssue[] {
  const stack: string[] = [];
  for (const char of term) {
    if (char === "(" || char === "[") {
      stack.push(char);
      continue;
    }
    if (char === ")" || char === "]") {
      if (stack.pop() !== PAIR[char]) {
        return [
          issue(char === ")" ? "UNBALANCED_PARENS" : "UNBALANCED_BRACKETS"),
        ];
      }
    }
  }
  if (stack.length > 0) {
    return [
      issue(stack.includes("(") ? "UNBALANCED_PARENS" : "UNBALANCED_BRACKETS"),
    ];
  }
  return [];
}
