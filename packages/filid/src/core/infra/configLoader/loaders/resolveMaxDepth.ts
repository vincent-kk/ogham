import { DEFAULT_SCAN_OPTIONS } from '../../../../constants/scanDefaults.js';

import type { FilidConfig } from './configSchemas.js';

/**
 * Resolve the effective fractal tree maxDepth from the priority chain:
 *   override (MCP input) → config.scan.maxDepth → DEFAULT_SCAN_OPTIONS.maxDepth
 *
 * Explicit `0` is honoured (early termination is allowed). `scan.maxDepth`
 * reaching here is already validated by zod, so no runtime type guard is needed.
 */
export function resolveMaxDepth(
  config: FilidConfig | null,
  override?: number,
): number {
  return override ?? config?.scan?.maxDepth ?? DEFAULT_SCAN_OPTIONS.maxDepth;
}
