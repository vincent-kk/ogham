import {
  STRUCTURE_PLAN_PATH_REQUIRED_MESSAGE,
  STRUCTURE_VALIDATION_MODES,
  STRUCTURE_VALIDATION_SCOPE_VALUES,
} from '../../../constants/mcpContracts.js';
import type {
  StructureValidateData,
  StructureValidateSummary,
} from '../../../types/report.js';
import type { RuleScope } from '../../../types/rules.js';
import type { ToolPayload } from '../../../types/toolEnvelope.js';

import { validatePlanMode } from './handlers/validatePlanMode.js';
import { validateProjectMode } from './handlers/validateProjectMode.js';

type StructureValidationMode =
  (typeof STRUCTURE_VALIDATION_MODES)[keyof typeof STRUCTURE_VALIDATION_MODES];

export interface StructureValidateInput {
  path: string;
  mode?: StructureValidationMode;
  scopes?: RuleScope[];
  planPath?: string;
}

export async function handleStructureValidate(
  input: StructureValidateInput,
): Promise<ToolPayload<StructureValidateSummary, StructureValidateData>> {
  const mode = input.mode ?? STRUCTURE_VALIDATION_MODES.PROJECT;
  const scopes = input.scopes ?? STRUCTURE_VALIDATION_SCOPE_VALUES;
  if (mode === STRUCTURE_VALIDATION_MODES.PROJECT)
    return validateProjectMode(input.path, scopes);
  if (!input.planPath) throw new Error(STRUCTURE_PLAN_PATH_REQUIRED_MESSAGE);
  return validatePlanMode(input.path, input.planPath, mode, scopes);
}
