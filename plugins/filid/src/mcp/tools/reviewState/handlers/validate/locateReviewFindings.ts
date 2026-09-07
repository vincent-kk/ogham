import { resolveFindingLines } from '../../diff/resolveFindingLines.js';
import { executeReviewGit } from '../../hash/executeReviewGit.js';
import type { ReviewFinding } from '../../opinion/reviewOpinionTypes.js';
import type { ReviewUnit } from '../../state/reviewGroupTypes.js';

/**
 * Resolve every reviewer finding against the committed HEAD source once per path.
 *
 * @param projectRoot Absolute repository root used for safe Git invocation.
 * @param findings Validated reviewer findings awaiting canonical locations.
 * @param units Prepared units whose hunks determine in-diff status.
 * @returns Findings with reviewer-supplied locations replaced by resolved facts.
 */
export async function locateReviewFindings(
  projectRoot: string,
  findings: readonly ReviewFinding[],
  units: readonly ReviewUnit[],
): Promise<ReviewFinding[]> {
  const sourceByPath = new Map<string, string>();
  const located: ReviewFinding[] = [];
  for (const finding of findings) {
    let sourceText = sourceByPath.get(finding.path);
    if (sourceText === undefined) {
      sourceText = await executeReviewGit(projectRoot, [
        'show',
        `HEAD:${finding.path}`,
      ]);
      sourceByPath.set(finding.path, sourceText);
    }
    const hunks = units
      .filter((unit) => unit.path === finding.path)
      .flatMap((unit) => unit.hunks);
    located.push({
      ...finding,
      ...resolveFindingLines(sourceText, finding.existingCode, hunks),
    });
  }
  return located;
}
