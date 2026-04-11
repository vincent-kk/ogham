import type { SummaryItemSeverity } from '../../../types/summary.js';

export function severityEmoji(severity: SummaryItemSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'pass':
      return '✅';
  }
}
