import type {
  ReviewFinding,
  ReviewOpinion,
  ReviewOpinionFile,
  ReviewOpinionGap,
} from './reviewOpinionTypes.js';

/** Deterministic result of merging one validated reviewer round. */
interface MergeReviewRoundsResult {
  /** Canonical opinion containing every unique finding through this round. */
  opinion: ReviewOpinion;
  /** Number of finding keys introduced by the current round. */
  newFindings: number;
}

/**
 * Merge a validated reviewer round into the canonical group opinion.
 *
 * @param prior - Canonical opinion through the preceding round, or null at round one.
 * @param current - Validated, line-resolved opinion for the current round.
 * @returns Canonical merged opinion and the count of newly introduced findings.
 */
export function mergeReviewRounds(
  prior: ReviewOpinion | null,
  current: ReviewOpinion,
): MergeReviewRoundsResult {
  if (prior === null)
    return {
      opinion: current,
      newFindings: current.findings.length,
    };

  const findings: ReviewFinding[] = [];
  const findingKeys = new Set<string>();
  for (const finding of prior.findings) {
    const key = JSON.stringify([
      finding.path,
      finding.lines,
      finding.rule,
      finding.existingCode,
    ]);
    if (!findingKeys.has(key)) {
      findingKeys.add(key);
      findings.push({ ...finding });
    }
  }

  let newFindings = 0;
  for (const finding of current.findings) {
    const key = JSON.stringify([
      finding.path,
      finding.lines,
      finding.rule,
      finding.existingCode,
    ]);
    if (!findingKeys.has(key)) {
      findingKeys.add(key);
      findings.push({ ...finding });
      newFindings += 1;
    }
  }

  const files = new Map<string, ReviewOpinionFile>();
  for (const file of [...prior.files, ...current.files]) {
    const key = JSON.stringify([file.path, file.change, file.chunk]);
    const existing = files.get(key);
    if (existing === undefined) files.set(key, { ...file });
    else if (file.result === 'skipped' && existing.result === 'reviewed')
      files.set(key, { ...file });
    else if (
      file.result === 'skipped' &&
      existing.result === 'skipped' &&
      existing.reason === null
    )
      files.set(key, { ...existing, reason: file.reason });
  }

  const gaps = new Map<string, ReviewOpinionGap>();
  for (const gap of [...prior.gaps, ...current.gaps]) {
    const key = JSON.stringify([gap.path, gap.rule, gap.detail]);
    if (!gaps.has(key)) gaps.set(key, { ...gap });
  }

  const opinion: ReviewOpinion = {
    ...current,
    round: Math.max(prior.round, current.round),
    state:
      prior?.state === 'INDETERMINATE' || current.state === 'INDETERMINATE'
        ? 'INDETERMINATE'
        : 'COMPLETE',
    files: [...files.values()],
    findings: findings.map((finding, index) => ({
      ...finding,
      id: `R${current.group}-${String(index + 1).padStart(3, '0')}`,
    })),
    checked: [...new Set([...prior.checked, ...current.checked])],
    gaps: [...gaps.values()],
    riskPlan: prior?.riskPlan ?? current.riskPlan,
  };
  return { opinion, newFindings };
}
