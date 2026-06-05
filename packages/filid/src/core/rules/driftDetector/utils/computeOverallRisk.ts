import type { DriftItem, DriftSeverity } from '../../../../types/drift.js';

export function computeOverallRisk(drifts: DriftItem[]): DriftSeverity {
  if (drifts.some((d) => d.severity === 'critical')) return 'critical';
  if (drifts.some((d) => d.severity === 'high')) return 'high';
  if (drifts.some((d) => d.severity === 'medium')) return 'medium';
  return 'low';
}
