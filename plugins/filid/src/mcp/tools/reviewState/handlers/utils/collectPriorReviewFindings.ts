import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import { readReviewGroupArtifactStatus } from '../../handoff/readReviewGroupArtifactStatus.js';
import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { checkReviewOpinion } from '../../opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../../opinion/parseReviewOpinion.js';
import { projectReviewOpinion } from '../../opinion/projectReviewOpinion.js';
import type { ReviewFinding } from '../../opinion/reviewOpinionTypes.js';
import { buildReviewOpinionCheckOptions } from '../../opinion/utils/buildReviewOpinionCheckOptions.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import { resolveReviewOpinionSourceHash } from '../../state/resolveReviewOpinionSourceHash.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';
import { joinDecisions } from '../../verdict/joinDecisions.js';

import { loadSealGroupEvidence } from './loadSealGroupEvidence.js';

/**
 * Carry unresolved earlier claims even if the latest reviewer has not completed.
 * @param previous Previously published generation with immutable opinion references.
 * @param paths Artifact directory for that generation.
 * @param renames Committed previous-to-current path mapping.
 * @returns Original finding IDs and claims located at their current paths.
 */
export function collectPriorReviewFindings(
  previous: ReviewStateRecord | null,
  paths: ReviewStatePaths,
  renames: ReadonlyMap<string, string>,
): ReviewFinding[] {
  if (!previous) return [];
  const evidence = loadSealGroupEvidence(
    paths,
    previous.groups,
    previous.sourceHash,
  );
  const refuted = new Set(
    joinDecisions(
      evidence,
      previous.scope.candidates,
      previous.scope.snapshotHash,
    ).refuted.map((finding) => finding.id),
  );
  const findings = new Map<string, ReviewFinding>();
  const statuses = readReviewGroupArtifactStatus(previous, paths);
  for (const group of evidence) {
    let review = group.review;
    if (
      !review &&
      statuses.some(
        (status) =>
          status.group === group.group.id && status.review === 'trusted',
      )
    ) {
      const bytes = readUtf8FileIfExistsSync(
        resolveReviewArtifactPath(paths, group.group.opinionPath),
      );
      const parsed = parseReviewOpinion(bytes ?? '');
      if (
        bytes !== null &&
        parsed.opinion &&
        computeReviewArtifactHash(bytes) ===
          group.group.validated.review?.sha256 &&
        checkReviewOpinion(
          parsed.opinion,
          buildReviewOpinionCheckOptions(
            group.group,
            group.group.validated.review.round,
            resolveReviewOpinionSourceHash(
              paths,
              group.group,
              previous.sourceHash,
            ) ?? '',
          ),
          [],
        )
      )
        review = projectReviewOpinion(parsed.opinion, group.group);
    }
    for (const finding of [
      ...(group.group.priorFindings ?? []),
      ...(review?.findings ?? []),
    ])
      if (!refuted.has(finding.id))
        findings.set(finding.id, {
          ...finding,
          path: renames.get(finding.path) ?? finding.path,
        });
  }
  return [...findings.values()];
}
