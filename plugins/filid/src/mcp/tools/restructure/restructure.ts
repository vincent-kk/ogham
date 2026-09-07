import { RESTRUCTURE_ACTIONS } from '../../../constants/mcpContracts.js';

import { planRestructure } from './handlers/planRestructure.js';
import { validateRestructurePlan } from './handlers/validateRestructurePlan.js';
import type {
  RestructureInput,
  RestructureResult,
} from './types/restructureTypes.js';

/**
 * Dispatches one restructure lifecycle action to its focused handler.
 *
 * @param input - Validated action-specific restructure input.
 * @returns The unchanged child payload for the selected action.
 */
export async function handleRestructure(
  input: RestructureInput,
): Promise<RestructureResult> {
  switch (input.action) {
    case RESTRUCTURE_ACTIONS.PLAN:
      return planRestructure({ path: input.path, requests: input.requests });
    case RESTRUCTURE_ACTIONS.PRECONDITION:
    case RESTRUCTURE_ACTIONS.POSTCONDITION:
      return validateRestructurePlan(input);
  }
}
