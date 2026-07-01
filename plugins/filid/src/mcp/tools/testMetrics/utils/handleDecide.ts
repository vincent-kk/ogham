import { decide } from '../../../../metrics/decisionTree/decisionTree.js';
import type { DecisionResult } from '../../../../types/metrics.js';
import type { DecisionParams } from '../testMetrics.js';

export function handleDecide(
  params?: DecisionParams,
): { decision: DecisionResult } | { error: string } {
  if (!params) return { error: 'Decision action requires decisionInput' };

  const result = decide({
    testCount: params.testCount,
    lcom4: params.lcom4,
    cyclomaticComplexity: params.cyclomaticComplexity,
  });

  return { decision: result };
}
