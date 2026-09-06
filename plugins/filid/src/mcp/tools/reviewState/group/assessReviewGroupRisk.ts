import {
  REVIEW_RISK_BOUNDARY_RULES,
  REVIEW_RISK_PATH_WORDS,
} from '../../../../constants/reviewRisk.js';
import { matchesReviewGlob } from '../rules/matchesReviewGlob.js';
import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type {
  ReviewScopeCandidate,
  ReviewScopeFile,
} from '../state/reviewStateTypes.js';

import { tokenizeReviewRiskPath } from './utils/tokenizeReviewRiskPath.js';

/** Facts available before any reviewer runs; no model-based triage is required. */
interface AssessReviewGroupRiskInput {
  /** Bounded assignment whose source files and candidate IDs determine scope. */
  group: ReviewGroup;
  /** Prepared roster carrying adapter facts and reviewability decisions. */
  files: readonly ReviewScopeFile[];
  /** Deterministic FCA claims available to the assigned group. */
  candidates: readonly ReviewScopeCandidate[];
  /** Additional project-relative globs from validated review configuration. */
  highRiskPaths: readonly string[];
}

/**
 * Select one evidence path per risk kind without treating absent signals as safety.
 * @param input Prepared assignment, roster, candidates, and additive path selectors.
 * @returns At most five deterministic routing reasons; candidate-only groups return none.
 */
export function assessReviewGroupRisk(
  input: AssessReviewGroupRiskInput,
): string[] {
  if (input.group.rounds === 0) return [];
  const paths = new Set(input.group.units.map(({ path }) => path));
  const files = input.files.filter(
    (file) =>
      paths.has(file.path) &&
      file.role === 'source' &&
      file.skipReason === null,
  );
  if (files.length === 0) return [];
  const reasons = new Map<string, string>();
  for (const file of files) {
    const words = tokenizeReviewRiskPath(file.path);
    for (const [kind, keywords] of Object.entries(REVIEW_RISK_PATH_WORDS))
      if (!reasons.has(kind) && keywords.some((word) => words.includes(word)))
        reasons.set(kind, `${kind}: ${file.path}`);
    if (file.publicEntryPoint && !reasons.has('public-boundary'))
      reasons.set('public-boundary', `public-boundary: ${file.path}`);
    if (
      !reasons.has('configured-path') &&
      input.highRiskPaths.some((glob) => matchesReviewGlob(glob, file.path))
    )
      reasons.set('configured-path', `configured-path: ${file.path}`);
  }
  const candidate = input.candidates.find(
    (item) =>
      input.group.candidateIds.includes(item.id) &&
      item.severity === 'error' &&
      REVIEW_RISK_BOUNDARY_RULES.includes(item.rule),
  );
  if (candidate)
    reasons.set(
      'boundary-evidence',
      `boundary-evidence: ${candidate.rule} (${candidate.path})`,
    );
  return [...reasons.values()];
}
