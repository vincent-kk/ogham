import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { checkReviewOpinion } from '../../opinion/checkReviewOpinion.js';
import { parseReviewOpinion } from '../../opinion/parseReviewOpinion.js';
import { projectReviewOpinion } from '../../opinion/projectReviewOpinion.js';
import type { ReviewOpinion } from '../../opinion/reviewOpinionTypes.js';
import { buildReviewOpinionCheckOptions } from '../../opinion/utils/buildReviewOpinionCheckOptions.js';
import type { VerifyOpinion } from '../../opinion/verifyOpinionTypes.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import { resolveReviewOpinionSourceHash } from '../../state/resolveReviewOpinionSourceHash.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewStatePaths } from '../../state/reviewStateTypes.js';
import type {
  ReviewTrustIssue,
  SealGroupEvidence,
} from '../../verdict/reviewVerdictTypes.js';

/**
 * Load only group opinions whose complete hash handoff remains intact.
 *
 * @param paths Canonical contained paths for the branch review.
 * @param groups Prepared groups in deterministic creation order.
 * @param sourceHash Prepared committed-source identity required by every opinion.
 * @returns Groups paired with trusted parsed artifacts and every trust failure.
 */
export function loadSealGroupEvidence(
  paths: ReviewStatePaths,
  groups: readonly ReviewGroup[],
  sourceHash: string,
  diagnostics?: import('../../../../../types/toolEnvelope.js').ToolDiagnostic[],
): SealGroupEvidence[] {
  return groups.map((group) => {
    const issueSet = new Set<ReviewTrustIssue>();
    const opinionSourceHash = resolveReviewOpinionSourceHash(
      paths,
      group,
      sourceHash,
    );
    if (opinionSourceHash === null) issueSet.add('artifact not validated');
    const reviewValidation = group.validated.review;
    const verifyValidation = group.validated.verify;
    const reviewPath = resolveReviewArtifactPath(paths, group.opinionPath);
    const verifyPath = resolveReviewArtifactPath(paths, group.verifyPath);
    const reviewBytes = readUtf8FileIfExistsSync(reviewPath);
    const verifyBytes = readUtf8FileIfExistsSync(verifyPath);

    if (reviewValidation !== null && !reviewValidation.complete)
      issueSet.add('review rounds incomplete');
    if (reviewValidation === null || verifyValidation === null)
      issueSet.add('artifact not validated');
    if (
      reviewValidation !== null &&
      (reviewBytes === null ||
        computeReviewArtifactHash(reviewBytes) !== reviewValidation.sha256)
    )
      issueSet.add('artifact modified after validation');
    if (
      verifyValidation !== null &&
      (verifyBytes === null ||
        computeReviewArtifactHash(verifyBytes) !== verifyValidation.sha256)
    )
      issueSet.add('artifact modified after validation');
    if (
      reviewValidation !== null &&
      verifyValidation !== null &&
      verifyValidation.reviewSha256 !== reviewValidation.sha256
    )
      issueSet.add('verifier decided a superseded opinion');

    let review: ReviewOpinion | null = null;
    let verify: VerifyOpinion | null = null;
    if (issueSet.size === 0 && reviewBytes !== null && verifyBytes !== null)
      try {
        const parsed = parseReviewOpinion(reviewBytes);
        if (
          !parsed.opinion ||
          !checkReviewOpinion(
            parsed.opinion,
            buildReviewOpinionCheckOptions(
              group,
              reviewValidation!.round,
              opinionSourceHash!,
              diagnostics,
            ),
            [],
          )
        )
          issueSet.add('artifact not validated');
        else
          review = projectReviewOpinion(
            {
              ...parsed.opinion,
              findings: [
                ...parsed.opinion.findings,
                ...(group.priorFindings ?? []),
              ],
            },
            group,
          );
        verify = JSON.parse(verifyBytes) as VerifyOpinion;
        if (verify.sourceHash !== opinionSourceHash)
          issueSet.add('source identity mismatch');
        if (group.opinionPaths && review)
          verify = {
            ...verify,
            decisions: verify.decisions.filter((decision) =>
              review!.findings.some(
                (finding) => finding.id === decision.findingId,
              ),
            ),
            observations: verify.observations
              .filter(
                (observation) =>
                  group.opinionPaths![observation.path] !== undefined ||
                  !group.opinionUnits?.some(
                    (unit) => unit.path === observation.path,
                  ),
              )
              .map((observation) => ({
                ...observation,
                path: group.opinionPaths![observation.path] ?? observation.path,
              })),
          };
      } catch {
        issueSet.add('artifact not validated');
      }

    if (issueSet.size > 0) {
      review = null;
      verify = null;
    }
    return { group, review, verify, sourceHash, issues: [...issueSet] };
  });
}
