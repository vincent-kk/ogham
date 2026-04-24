import type { HumanSummary } from '../../../../types/summary.js';

export function formatHumanSummary(summary: HumanSummary): string {
  return summary.markdown;
}
