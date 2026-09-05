import type { ReviewScopeRole } from '../state/reviewStateTypes.js';

/** Conditional selectors supported by the built-in review rule map. */
export type ReviewRuleWhen = 'role:verification' | 'role:document' | 'owner';

/** One declared rule before its Markdown body is loaded. */
export interface ReviewRuleDefinition {
  /** Stable identifier stored on review scope rows. */
  id: string;
  /** Whether the rule applies to every reviewable path. */
  always?: true;
  /** Anchored project-relative path patterns that activate the rule. */
  match?: readonly string[];
  /** Role or ownership condition that activates the rule. */
  when?: ReviewRuleWhen;
  /** Rule-map-relative or project-relative Markdown body path. */
  file: string;
  /** Built-in identifiers disabled by a repository override. */
  replaces?: readonly string[];
}

/** A validated rule paired with the Markdown supplied to reviewers. */
export interface LoadedReviewRule extends ReviewRuleDefinition {
  /** Exact UTF-8 Markdown body read from the declared file. */
  body: string;
}

/** Minimal changed-file facts used by deterministic rule selection. */
export interface ReviewRuleFile {
  /** Repository-relative changed path. */
  path: string;
  /** Role assigned by changed-file selection. */
  role: ReviewScopeRole;
  /** Project-relative owner path, or null when no owner exists. */
  owner: string | null;
}

/** Inputs for selecting active review rule identifiers for one path. */
export interface ResolveFileRulesInput {
  /** Reviewable changed-file facts. */
  file: ReviewRuleFile;
  /** Validated built-in rules in declaration order. */
  rules: readonly ReviewRuleDefinition[];
  /** Validated repository overrides in declaration order. */
  overrides: readonly ReviewRuleDefinition[];
}
