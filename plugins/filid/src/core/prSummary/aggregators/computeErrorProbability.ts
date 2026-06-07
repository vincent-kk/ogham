import {
  DEFAULT_ERROR_PROBABILITY,
  RULE_ERROR_PROBABILITY,
  SEVERITY_FALLBACK,
} from '../../../constants/reviewProbabilities.js';

/** 에러 확률을 계산한다. ruleId → RULE_ERROR_PROBABILITY → severity fallback → DEFAULT. */
export function computeErrorProbability(
  ruleId: string,
  severity: string,
): number {
  if (ruleId && RULE_ERROR_PROBABILITY[ruleId] !== undefined) {
    return RULE_ERROR_PROBABILITY[ruleId];
  }
  if (severity && SEVERITY_FALLBACK[severity] !== undefined) {
    return SEVERITY_FALLBACK[severity];
  }
  return DEFAULT_ERROR_PROBABILITY;
}
