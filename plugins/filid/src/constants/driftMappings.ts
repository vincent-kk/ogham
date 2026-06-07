import type { DriftSeverity, SyncAction } from '../types/drift.js';

export const RULE_TO_ACTION: Record<string, SyncAction> = {
  'naming-convention': 'rename',
  'organ-no-intentmd': 'move',
  'index-barrel-pattern': 'create-index',
  'module-entry-point': 'create-index',
  'max-depth': 'merge',
  'circular-dependency': 'move',
  'pure-function-isolation': 'move',
};

export const RULE_TO_SEVERITY: Record<string, DriftSeverity> = {
  'circular-dependency': 'critical',
  'pure-function-isolation': 'critical',
  'max-depth': 'high',
  'organ-no-intentmd': 'high',
  'index-barrel-pattern': 'medium',
  'module-entry-point': 'medium',
  'naming-convention': 'low',
};

export const SEVERITY_ORDER: Record<DriftSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
