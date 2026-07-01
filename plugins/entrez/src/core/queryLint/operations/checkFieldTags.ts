import type { LintIssue } from "../../../types/search.js";

const LINT_CODE = {
  PHRASE_DISABLES_ATM: "PHRASE_DISABLES_ATM",
  WILDCARD_DISABLES_EXPANSION: "WILDCARD_DISABLES_EXPANSION",
} as const;

const LINT_MESSAGE = {
  PHRASE_DISABLES_ATM:
    "Double-quoted phrase disables PubMed Automatic Term Mapping (ATM); MeSH and synonym expansion are skipped, reducing recall.",
  WILDCARD_DISABLES_EXPANSION:
    "Wildcard '*' truncation disables ATM and MeSH explosion; the term is not expanded, reducing recall.",
} as const;

/** Matches a closed double-quoted phrase such as "breast cancer". */
const QUOTED_PHRASE = /"[^"]*"/;

/**
 * Flag recall-degrading patterns (warnings only): a double-quoted phrase
 * (disables ATM) and a wildcard '*' (disables ATM/MeSH explosion). Returns [].
 */
export function checkFieldTags(term: string): LintIssue[] {
  const issues: LintIssue[] = [];
  if (QUOTED_PHRASE.test(term))
    issues.push({
      code: LINT_CODE.PHRASE_DISABLES_ATM,
      message: LINT_MESSAGE.PHRASE_DISABLES_ATM,
      severity: "warning",
    });

  if (term.includes("*"))
    issues.push({
      code: LINT_CODE.WILDCARD_DISABLES_EXPANSION,
      message: LINT_MESSAGE.WILDCARD_DISABLES_EXPANSION,
      severity: "warning",
    });

  return issues;
}
