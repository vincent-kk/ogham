import { projectRoot } from '@ogham/cross-platform';

import {
  PROJECT_SETUP_ACTIONS,
  PROJECT_SETUP_RULE_DOC_ACTION_BY_ACTION,
  RULE_DOC_ACTIONS,
  RULE_DOC_DIAGNOSTIC_CODES,
  RULE_DOC_DIAGNOSTIC_MESSAGES,
} from '../../../../constants/mcpContracts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import type {
  ToolDiagnostic,
  ToolPayload,
} from '../../../../types/toolEnvelope.js';
import { handleRuleDocsSync } from '../ruleDocsSync/index.js';
import type {
  ProjectSetupInput,
  RuleDocsSyncData,
} from '../types/projectSetupTypes.js';

type RuleDocsActionInput = Extract<
  ProjectSetupInput,
  {
    action:
      | typeof PROJECT_SETUP_ACTIONS.RULES_STATUS
      | typeof PROJECT_SETUP_ACTIONS.RULES_MANIFEST
      | typeof PROJECT_SETUP_ACTIONS.RULES_SYNC;
  }
>;

const EMPTY_DIAGNOSTICS: ReadonlyArray<Readonly<ToolDiagnostic>> =
  Object.freeze([]);
const PLUGIN_ROOT_UNRESOLVED_DIAGNOSTICS: ReadonlyArray<
  Readonly<ToolDiagnostic>
> = Object.freeze([
  Object.freeze({
    code: RULE_DOC_DIAGNOSTIC_CODES.PLUGIN_ROOT_UNRESOLVED,
    message: RULE_DOC_DIAGNOSTIC_MESSAGES.PLUGIN_ROOT_UNRESOLVED,
  }),
]);

function copyDiagnostics(
  diagnostics: ReadonlyArray<Readonly<ToolDiagnostic>>,
): ToolDiagnostic[] {
  return diagnostics.map((diagnostic) => ({ ...diagnostic }));
}

/**
 * Maps setup actions to child rule actions and preserves their payload shape.
 *
 * @param input - Validated status, manifest, or synchronization action input.
 * @returns The existing action-specific rule-document payload.
 */
export function syncRuleDocs(
  input: RuleDocsActionInput,
): ToolPayload<Record<string, string | number>, RuleDocsSyncData> {
  const root = projectRoot(input.path);
  const output = handleRuleDocsSync({
    action: PROJECT_SETUP_RULE_DOC_ACTION_BY_ACTION[input.action],
    path: root,
    selections:
      input.action === PROJECT_SETUP_ACTIONS.RULES_SYNC
        ? input.selections
        : undefined,
    resync:
      input.action === PROJECT_SETUP_ACTIONS.RULES_SYNC
        ? input.resync
        : undefined,
  });

  switch (output.action) {
    case RULE_DOC_ACTIONS.STATUS:
      return {
        projectRoot: root,
        status: output.status.pluginRootResolved
          ? TOOL_STATUSES.OK
          : TOOL_STATUSES.UNSUPPORTED,
        summary: {
          action: output.action,
          optional: output.status.entries.length,
          required: output.status.autoDeployed.length,
          deployed:
            output.status.entries.filter((entry) => entry.deployed).length +
            output.status.autoDeployed.filter((entry) => entry.deployed).length,
        },
        data: output,
        diagnostics: copyDiagnostics(
          output.status.pluginRootResolved
            ? EMPTY_DIAGNOSTICS
            : PLUGIN_ROOT_UNRESOLVED_DIAGNOSTICS,
        ),
      };

    case RULE_DOC_ACTIONS.MANIFEST:
      return {
        projectRoot: root,
        status: output.pluginRootResolved
          ? TOOL_STATUSES.OK
          : TOOL_STATUSES.UNSUPPORTED,
        summary: {
          action: output.action,
          rules: output.manifest.rules.length,
          skipped: output.skipped?.length ?? 0,
        },
        data: output,
        diagnostics: copyDiagnostics(
          output.pluginRootResolved
            ? EMPTY_DIAGNOSTICS
            : PLUGIN_ROOT_UNRESOLVED_DIAGNOSTICS,
        ),
      };

    case RULE_DOC_ACTIONS.SYNC:
      return {
        projectRoot: root,
        status: TOOL_STATUSES.OK,
        summary: {
          action: output.action,
          created: output.result.copied.length,
          updated: output.result.updated.length,
          removed: output.result.removed.length,
          skipped: output.result.skipped.length,
          drift: output.result.drift.length,
        },
        data: output,
        diagnostics: copyDiagnostics(EMPTY_DIAGNOSTICS),
      };
  }
}
