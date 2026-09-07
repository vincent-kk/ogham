import {
  REVIEW_HANDOFF_CLASS_ORDER,
  REVIEW_HANDOFF_HASH_LIMIT,
  REVIEW_HANDOFF_MAX_ENTRIES,
  REVIEW_HANDOFF_NOTE_LIMIT,
  REVIEW_HANDOFF_PATH_LIMIT,
  REVIEW_HANDOFF_RULE_ID_LIMIT,
  REVIEW_HANDOFF_SCHEMA_VERSION,
  type ReviewHandoffClass,
} from '../../../../constants/reviewState.js';
import type {
  ReviewHandoffCallerEntry,
  ReviewHandoffDocumentSync,
  ReviewScopeViolation,
} from '../state/reviewStateTypes.js';

import {
  REVIEW_HANDOFF_SEED_SCHEMA,
  type ReviewHandoffEntry,
  type ReviewHandoffSeed,
} from './reviewHandoffSeedSchema.js';
import { normalizeHandoffCallerEntry } from './normalizeHandoffCallerEntry.js';

/**
 * Replace an oversized path with its nearest serializable ancestor.
 * @param path Normalized project-relative path from snapshot evidence.
 * @returns A real ancestor within the handoff path limit, or project root.
 */
function boundHandoffPath(path: string): string {
  let bounded = path;
  while (bounded.length > REVIEW_HANDOFF_PATH_LIMIT && bounded.includes('/'))
    bounded = bounded.slice(0, bounded.lastIndexOf('/'));
  if (bounded.length === 0 || bounded.length > REVIEW_HANDOFF_PATH_LIMIT)
    return '.';
  return bounded;
}

/**
 * Build and validate the deterministic machine-readable PR handoff seed.
 * @param input Snapshot evidence, synchronization facts, and caller claims.
 * @returns Schema-valid bounded seed and complete pre-truncation class counts.
 */
export function buildHandoffSeed(input: {
  /** Snapshot identity, or null after validation failure. */
  snapshotHash: string | null;
  /** Owner paths represented by the handoff. */
  scope: readonly string[];
  /** Effective Stage 1 document synchronization result. */
  documentSync: ReviewHandoffDocumentSync;
  /** Number of documents repaired during Stage 1. */
  repaired: number;
  /** Classified changed-scope findings retained for review. */
  findings: readonly {
    /** Normalized violation carrying rule, severity, path, and message. */
    violation: ReviewScopeViolation;
    /** Handoff treatment selected from the classification table. */
    class: ReviewHandoffClass;
    /** Prefix marking default or scope-uncertain classification. */
    notePrefix: string;
  }[];
  /** Project-root findings whose scope could not be assigned to an owner. */
  outOfScopeRoot: readonly ReviewScopeViolation[];
  /** Stage 1 claims supplied by the caller and bounded when recorded. */
  callerEntries: readonly ReviewHandoffCallerEntry[];
}): {
  seed: ReviewHandoffSeed;
  counts: Record<ReviewHandoffClass, number>;
} {
  const entries: ReviewHandoffEntry[] = [
    ...input.findings.map(
      ({ violation, class: handoffClass, notePrefix }): ReviewHandoffEntry => ({
        class: handoffClass,
        ruleId: violation.ruleId.slice(0, REVIEW_HANDOFF_RULE_ID_LIMIT),
        path: boundHandoffPath(violation.path),
        severity: violation.severity,
        certainty: violation.certainty ?? 'unstated',
        note: `${notePrefix}${violation.message}`.slice(
          0,
          REVIEW_HANDOFF_NOTE_LIMIT,
        ),
      }),
    ),
    ...input.outOfScopeRoot.map((violation): ReviewHandoffEntry => ({
      class: 'indeterminate',
      ruleId: violation.ruleId.slice(0, REVIEW_HANDOFF_RULE_ID_LIMIT),
      path: boundHandoffPath(violation.path),
      severity: violation.severity,
      certainty: violation.certainty ?? 'unstated',
      note: `scope-uncertain: ${violation.message}`.slice(
        0,
        REVIEW_HANDOFF_NOTE_LIMIT,
      ),
    })),
    ...input.callerEntries.map(normalizeHandoffCallerEntry),
  ].sort((left, right) => {
    const classDifference =
      REVIEW_HANDOFF_CLASS_ORDER.indexOf(left.class) -
      REVIEW_HANDOFF_CLASS_ORDER.indexOf(right.class);
    if (classDifference !== 0) return classDifference;
    if (left.path !== right.path) return left.path < right.path ? -1 : 1;
    if (left.ruleId === right.ruleId) return 0;
    return left.ruleId < right.ruleId ? -1 : 1;
  });
  const counts = Object.fromEntries(
    REVIEW_HANDOFF_CLASS_ORDER.map((handoffClass) => [
      handoffClass,
      entries.filter((entry) => entry.class === handoffClass).length,
    ]),
  ) as Record<ReviewHandoffClass, number>;
  const recorded = entries.slice(0, REVIEW_HANDOFF_MAX_ENTRIES);
  const scope = input.scope
    .map(boundHandoffPath)
    .sort()
    .filter((path, index, paths) => index === 0 || path !== paths[index - 1]);
  const seed = REVIEW_HANDOFF_SEED_SCHEMA.parse({
    schema: REVIEW_HANDOFF_SCHEMA_VERSION,
    snapshotHash:
      input.snapshotHash?.slice(0, REVIEW_HANDOFF_HASH_LIMIT) ?? null,
    scope,
    documentSync: input.documentSync,
    repaired: input.repaired,
    recorded,
    truncated: entries.length - recorded.length,
  });
  return { seed, counts };
}
