import {
  STRUCTURE_VALIDATION_MODES,
  STRUCTURE_VALIDATION_SCOPE_VALUES,
} from '../../../../constants/mcpContracts.js';
import { validateStructure } from '../../../../core/index.js';
import type {
  StructureValidateSummary,
  ValidationReport,
} from '../../../../types/report.js';
import type { RuleScope } from '../../../../types/rules.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';

import { resolveProjectValidationStatus } from './utils/resolveProjectValidationStatus.js';

/** Input accepted by project-level FCA structure validation. */
export interface StructureValidateInput {
  path: string;
  scopes?: RuleScope[];
}

/**
 * Validates the requested FCA rule scopes against one project snapshot.
 *
 * @param input - Project root and optional scopes; all scopes are the default.
 * @returns The project validation report and bounded summary.
 */
export async function handleStructureValidate(
  input: StructureValidateInput,
): Promise<ToolPayload<StructureValidateSummary, ValidationReport>> {
  const scopes = input.scopes ?? STRUCTURE_VALIDATION_SCOPE_VALUES;
  const context = await createToolSnapshot(input.path);
  const report = validateStructure(context.snapshot, context.rules, {
    maxDepth: context.maxDepth,
    scopes,
  });
  return {
    projectRoot: context.snapshot.projectRoot,
    status: resolveProjectValidationStatus(report, context.diagnostics),
    summary: {
      projectRoot: context.snapshot.projectRoot,
      snapshotHash: context.snapshot.snapshotHash,
      mode: STRUCTURE_VALIDATION_MODES.PROJECT,
      scopes,
      findingCount: report.result.violations.length,
      passed: report.result.passed,
      failed: report.result.failed,
      skipped: report.result.skipped,
    },
    data: report,
    diagnostics: context.diagnostics,
  };
}
