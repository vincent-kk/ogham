import { FRACTAL_INSPECT_ACTIONS } from '../../../constants/mcpContracts.js';

import { handleContextResolve } from './contextResolve/index.js';
import { handleFractalScan } from './fractalScan/index.js';
import { handleStructureValidate } from './structureValidate/index.js';
import type {
  FractalInspectInput,
  FractalInspectResult,
} from './types/fractalInspectTypes.js';
import { handleVerificationScan } from './verificationScan/index.js';

/**
 * Dispatches one read-only inspection action to its child entry point.
 *
 * @param input - Validated action-specific inspection input.
 * @returns The unchanged child payload for the selected action.
 */
export async function handleFractalInspect(
  input: FractalInspectInput,
): Promise<FractalInspectResult> {
  switch (input.action) {
    case FRACTAL_INSPECT_ACTIONS.SCAN:
      return handleFractalScan({
        path: input.path,
        maxDepth: input.maxDepth,
        detail: input.detail,
        nameFilter: input.nameFilter,
      });
    case FRACTAL_INSPECT_ACTIONS.VALIDATE:
      return handleStructureValidate({
        path: input.path,
        scopes: input.scopes,
      });
    case FRACTAL_INSPECT_ACTIONS.VERIFICATION:
      return handleVerificationScan({
        path: input.path,
        filePaths: input.filePaths,
        detail: input.detail,
      });
    case FRACTAL_INSPECT_ACTIONS.RESOLVE:
      return handleContextResolve({
        path: input.path,
        requests: input.requests,
      });
  }
}
