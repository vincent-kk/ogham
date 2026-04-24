import type { AnalysisReport } from '../../../types/report.js';
import {
  HEALTH_BASE_SCORE,
  ERROR_PENALTY,
  ERROR_PENALTY_CAP,
  WARNING_PENALTY,
  WARNING_PENALTY_CAP,
  CRITICAL_DRIFT_PENALTY,
  CRITICAL_DRIFT_CAP,
  HIGH_DRIFT_PENALTY,
  HIGH_DRIFT_CAP,
} from '../../../constants/health-score.js';

/**
 * AnalysisReport에서 건강도 점수(0~100)를 계산한다.
 *
 * 계산 공식:
 * base = 100
 * - error violations: -5점씩 (최대 -50)
 * - warning violations: -2점씩 (최대 -20)
 * - critical drifts: -10점씩 (최대 -30)
 * - high drifts: -5점씩 (최대 -20)
 * 최솟값: 0
 */
export function calculateHealthScore(report: AnalysisReport): number {
  let score = HEALTH_BASE_SCORE;

  const { violations } = report.validation.result;
  let errorCount = 0;
  let warningCount = 0;
  for (const v of violations) {
    if (v.severity === 'error') errorCount++;
    else if (v.severity === 'warning') warningCount++;
  }

  score -= Math.min(errorCount * ERROR_PENALTY, ERROR_PENALTY_CAP);
  score -= Math.min(warningCount * WARNING_PENALTY, WARNING_PENALTY_CAP);

  const { bySeverity } = report.drift.drift;
  score -= Math.min((bySeverity.critical ?? 0) * CRITICAL_DRIFT_PENALTY, CRITICAL_DRIFT_CAP);
  score -= Math.min((bySeverity.high ?? 0) * HIGH_DRIFT_PENALTY, HIGH_DRIFT_CAP);

  return Math.max(0, score);
}
