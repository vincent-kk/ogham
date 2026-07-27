import { STRUCTURE_VALIDATION_MODES } from '../../../../constants/mcpContracts.js';
import { validateStructure } from '../../../../core/index.js';
import type {
  StructureValidateData,
  StructureValidateSummary,
} from '../../../../types/report.js';
import type { RuleScope } from '../../../../types/rules.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';
import { resolveProjectValidationStatus } from '../utils/resolveProjectValidationStatus.js';

export async function validateProjectMode(
  path: string,
  scopes: RuleScope[],
): Promise<ToolPayload<StructureValidateSummary, StructureValidateData>> {
  const context = await createToolSnapshot(path);
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
