import { FRACTAL_SCAN_DETAILS } from '../../../constants/mcpContracts.js';
import { validateStructure } from '../../../core/index.js';
import type {
  FractalScanData,
  FractalScanSummary,
} from '../../../types/report.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../utils/createToolSnapshot.js';

import { buildScanResult } from './utils/buildScanResult.js';

export interface FractalScanInput {
  path: string;
  /** Max-depth RULE threshold override — never a traversal limit. */
  maxDepth?: number;
  detail?: (typeof FRACTAL_SCAN_DETAILS)[keyof typeof FRACTAL_SCAN_DETAILS];
}

export async function handleFractalScan(
  input: FractalScanInput,
): Promise<ToolPayload<FractalScanSummary, FractalScanData>> {
  const context = await createToolSnapshot(input.path, input.maxDepth);
  const validation = validateStructure(context.snapshot, context.rules, {
    maxDepth: context.maxDepth,
  });
  return buildScanResult(
    context.snapshot,
    validation,
    input.detail ?? FRACTAL_SCAN_DETAILS.SUMMARY,
    context.diagnostics,
  );
}
