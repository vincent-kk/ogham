import type { ReviewReuseSummary } from '../../state/reviewIncrementalTypes.js';

/**
 * Render the six actor-work counters shared by report and session artifacts.
 * @param summary Tool-computed reuse decisions for the active generation.
 * @returns Stable Markdown table with machine-readable field names.
 */
export function renderReviewReuseSummary(summary: ReviewReuseSummary): string {
  return [
    '| Field | Value |',
    '| --- | --- |',
    ...Object.entries(summary).map(([key, value]) => `| ${key} | ${value} |`),
  ].join('\n');
}
