import type { SummaryItemSeverity } from '../../../types/summary.js';

/** SummaryItemSeverity를 fix-requests severity 문자열로부터 결정한다. */
export function mapSeverity(severity: string): SummaryItemSeverity {
  switch (severity) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
    case 'LOW':
    default:
      return 'info';
  }
}
