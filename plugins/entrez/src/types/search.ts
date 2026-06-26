/**
 * @file search.ts
 * @description Shared search-engine result types produced by core (union,
 * segmenter, queryLint, espell). Tool-level I/O (PaperSearchInput/Output) is
 * layered on top in Phase 5.
 */
import type { DateField } from "./enums.js";
import type { PaperRecord } from "./record.js";

/** Deduped union of records across queries. */
export interface UnionResult {
  records: PaperRecord[];
  total_unique: number;
  dedup_collisions: number;
}

/** A date bucket produced when ESearch Count exceeds the 10k cap. */
export interface DateSegment {
  field: DateField;
  from: string;
  to: string;
  count: number;
  /** Still over the cap (needs further splitting / max depth reached). */
  capped: boolean;
}

/** A query-lint finding. */
export interface LintIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

/** Result of linting a single query term. */
export interface LintResult {
  ok: boolean;
  issues: LintIssue[];
}

/** Result of an ESpell spelling check. */
export interface EspellResult {
  original: string;
  corrected?: string;
  hasCorrection: boolean;
}
