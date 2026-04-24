import type { DecisionResult } from '../../../types/metrics.js';

import { handleCheck312 } from './utils/handle-check312.js';
import { handleCount } from './utils/handle-count.js';
import { handleDecide } from './utils/handle-decide.js';

/** File content for test analysis */
export interface TestFileInput {
  filePath: string;
  content: string;
}

/** Decision input parameters */
export interface DecisionParams {
  testCount: number;
  lcom4: number;
  cyclomaticComplexity: number;
}

/** Input for test-metrics tool */
export interface TestMetricsInput {
  /** Action to perform */
  action: 'count' | 'check-312' | 'decide';
  /** Test files (for count/check-312) */
  files?: TestFileInput[];
  /** Decision parameters (for decide) */
  decisionInput?: DecisionParams;
}

/** Test count result */
export interface TestCountResult {
  filePath: string;
  total: number;
  basic: number;
  complex: number;
}

/** 3+12 violation */
export interface ThreePlusTwelveViolation {
  filePath: string;
  testCount: number;
  threshold: number;
}

/** Output of test-metrics tool */
export interface TestMetricsOutput {
  /** Test case counts (for 'count') */
  counts?: TestCountResult[];
  /** 3+12 violations (for 'check-312') */
  violations?: ThreePlusTwelveViolation[];
  /** Decision result (for 'decide') */
  decision?: DecisionResult;
  /** Error message */
  error?: string;
}

/**
 * Handle test-metrics MCP tool calls.
 *
 * Actions:
 * - count: Count test cases in provided file content
 * - check-312: Check 3+12 rule violations
 * - decide: Run decision tree (split/compress/parameterize)
 */
export function handleTestMetrics(input: TestMetricsInput): TestMetricsOutput {
  switch (input.action) {
    case 'count':
      return handleCount(input.files ?? []);
    case 'check-312':
      return handleCheck312(input.files ?? []);
    case 'decide':
      return handleDecide(input.decisionInput);
    default:
      return { error: `Unknown action: ${input.action}` };
  }
}
