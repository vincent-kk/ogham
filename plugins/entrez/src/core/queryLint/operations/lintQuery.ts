import type { LintResult } from "../../../types/search.js";
import { checkParens } from "./checkParens.js";
import { checkFieldTags } from "./checkFieldTags.js";

/**
 * Lint a single query term by combining structural (parens/brackets) and
 * recall-degradation (phrase/wildcard) checks. `ok` is false iff any error.
 */
export function lintQuery(term: string): LintResult {
  const issues = [...checkParens(term), ...checkFieldTags(term)];
  return { ok: issues.every((i) => i.severity !== "error"), issues };
}
