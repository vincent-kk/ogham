import type { ReviewGroup } from '../state/reviewGroupTypes.js';

import type { ReviewOpinion } from './reviewOpinionTypes.js';

/**
 * Select retained file results without modifying their opinion artifact.
 * @param opinion Validated original opinion, including its original sourceHash.
 * @param group Current retained assignment and original-to-current path mapping.
 * @returns An in-memory view containing only retained coverage and findings.
 */
export function projectReviewOpinion(
  opinion: ReviewOpinion,
  group: ReviewGroup,
): ReviewOpinion {
  if (!group.opinionPaths) return opinion;
  const paths = group.opinionPaths;
  return {
    ...opinion,
    files: opinion.files
      .filter((file) => paths[file.path] !== undefined)
      .map((file) => ({ ...file, path: paths[file.path] })),
    findings: opinion.findings
      .filter((finding) => paths[finding.path] !== undefined)
      .map((finding) => ({ ...finding, path: paths[finding.path] })),
    gaps: opinion.gaps
      .filter(
        (gap) =>
          paths[gap.path] !== undefined ||
          !group.opinionUnits?.some((unit) => unit.path === gap.path),
      )
      .map((gap) => ({ ...gap, path: paths[gap.path] ?? gap.path })),
  };
}
