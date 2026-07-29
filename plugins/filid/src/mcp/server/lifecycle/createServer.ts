import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  FRACTAL_SCAN_DETAILS,
  MCP_SERVER_NAME,
  MCP_TOOL_DESCRIPTIONS,
  RULE_DOC_ACTIONS,
  STRUCTURE_VALIDATION_MODES,
  STRUCTURE_VALIDATION_SCOPES,
  VERIFICATION_SCAN_DETAILS,
} from '../../../constants/mcpContracts.js';
import { McpToolName } from '../../../constants/mcpToolNames.js';
import { CONTRACT_INTENTS } from '../../../constants/restructure.js';
import { REVIEW_STATE_ACTIONS } from '../../../constants/reviewState.js';
import { VERSION } from '../../../version.js';
import {
  handleContextResolve,
  handleFractalScan,
  handleRestructurePlan,
  handleReviewState,
  handleStructureValidate,
  handleVerificationScan,
} from '../../tools/index.js';
import { wrapHandler } from '../envelope/wrapHandler.js';
import { handleOpenSettingsTool } from '../handlers/handleOpenSettingsTool.js';
import { handleProjectInitTool } from '../handlers/handleProjectInitTool.js';
import { handleRuleDocsSyncTool } from '../handlers/handleRuleDocsSyncTool.js';
import { deferInputValidation } from '../utils/deferInputValidation.js';

const PROJECT_ROOT_DESCRIPTION =
  'Absolute path used as-is as the root of this call — nothing is resolved ' +
  'upward, so passing a subdirectory scopes the work to that subtree. Project ' +
  'config (.filid/config.json) is the exception: it is always read from the ' +
  'enclosing git repository root.';

const PROJECT_INIT_INPUT_SCHEMA = z.object({
  path: z.string().optional().describe(PROJECT_ROOT_DESCRIPTION),
  language: z
    .string()
    .optional()
    .describe('Output language tag for generated documents, e.g. "ko".'),
  adapterIds: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe('Ecosystem adapter IDs to enable, e.g. ["ecmascript"].'),
});

const RULE_DOCS_SYNC_INPUT_SCHEMA = z.object({
  action: z
    .nativeEnum(RULE_DOC_ACTIONS)
    .describe(
      'status reports deployment state; manifest lists managed rules; sync writes them.',
    ),
  path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  selections: z
    .union([z.record(z.string(), z.boolean()), z.string()])
    .nullish()
    .describe('sync only: rule ID to enabled flag. Omit to deploy all.'),
  resync: z
    .union([z.array(z.string()), z.string()])
    .nullish()
    .describe('sync only: rule IDs to overwrite even when already deployed.'),
});

const OPEN_SETTINGS_INPUT_SCHEMA = z.object({
  path: z.string().optional().describe(PROJECT_ROOT_DESCRIPTION),
  waitSeconds: z
    .number()
    .positive()
    .optional()
    .describe('How long to wait for the browser form to be submitted.'),
});

const FRACTAL_SCAN_INPUT_SCHEMA = z.object({
  path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  maxDepth: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      'Overrides the configured max-depth RULE THRESHOLD — not a traversal ' +
        'limit. The tree is always walked in full; lowering this only makes ' +
        'more nodes violate the depth rule. Omit it to use the project config.',
    ),
  detail: z
    .nativeEnum(FRACTAL_SCAN_DETAILS)
    .optional()
    .describe(
      'summary (default) returns counts only; paths adds node paths, ' +
        'classification basis and entry-point export names; full adds ' +
        'snapshot evidence.',
    ),
  nameFilter: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Directory name matched exactly, narrowing the paths projection to ' +
        'nodes with that name — answers "where does this organ name appear ' +
        'across the tree?". Summary counts still describe the whole tree.',
    ),
});

const CONTEXT_RESOLVE_INPUT_SCHEMA = z.object({
  path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  targetPath: z
    .string()
    .describe(
      'Absolute path whose owning fractal and INTENT/DETAIL chain to resolve.',
    ),
  comparePaths: z
    .array(z.string())
    .optional()
    .describe(
      'Paths whose lowest common fractal to resolve — the placement question ' +
        '"where does code shared between these consumers belong?". Returns ' +
        'null when no single fractal owns them all. Omit to resolve only the ' +
        'target chain.',
    ),
});

const RESTRUCTURE_PLAN_INPUT_SCHEMA = z.object({
  path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  requests: z
    .array(
      z.object({
        sourcePath: z.string().describe('Absolute path of the unit to place.'),
        consumerPaths: z
          .array(z.string())
          .optional()
          .describe(
            'Known consumers. Omit to derive them from snapshot evidence.',
          ),
        contractIntent: z
          .nativeEnum(CONTRACT_INTENTS)
          .optional()
          .describe(
            'Whether the unit should land as a child fractal or an organ.',
          ),
        organNameHint: z
          .string()
          .optional()
          .describe(
            'Proposed organ name. Unnamed groups stop the plan for a human.',
          ),
      }),
    )
    .describe('Placement requests evaluated against one shared snapshot.'),
});

const STRUCTURE_VALIDATION_COMMON_SCHEMA = {
  path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  scopes: z
    .array(z.nativeEnum(STRUCTURE_VALIDATION_SCOPES))
    .optional()
    .describe('Rule scopes to evaluate. Omit to evaluate all six.'),
};

const STRUCTURE_VALIDATE_INPUT_SCHEMA = z.union([
  z.object({
    ...STRUCTURE_VALIDATION_COMMON_SCHEMA,
    mode: z.literal(STRUCTURE_VALIDATION_MODES.PROJECT).optional(),
    planPath: z.string().optional(),
  }),
  z.object({
    ...STRUCTURE_VALIDATION_COMMON_SCHEMA,
    mode: z.literal(STRUCTURE_VALIDATION_MODES.PLAN_PRECONDITION),
    planPath: z.string(),
  }),
  z.object({
    ...STRUCTURE_VALIDATION_COMMON_SCHEMA,
    mode: z.literal(STRUCTURE_VALIDATION_MODES.PLAN_POSTCONDITION),
    planPath: z.string(),
  }),
]);

const STRUCTURE_VALIDATE_ADVERTISED_INPUT_SCHEMA = z.object({
  ...STRUCTURE_VALIDATION_COMMON_SCHEMA,
  mode: z
    .nativeEnum(STRUCTURE_VALIDATION_MODES)
    .optional()
    .describe(
      'project (default) validates the tree; the plan modes check a ' +
        'restructure plan before and after an external actor performs it.',
    ),
  planPath: z
    .string()
    .optional()
    .describe('Absolute plan artifact path. Required by both plan modes.'),
});

const VERIFICATION_SCAN_INPUT_SCHEMA = z.object({
  path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  filePaths: z
    .array(z.string())
    .optional()
    .describe('Restrict the scan to these files. Omit to scan the project.'),
  detail: z
    .nativeEnum(VERIFICATION_SCAN_DETAILS)
    .optional()
    .describe(
      'summary (default) returns role counts and caps; files adds per-file evidence.',
    ),
});

const REVIEW_STATE_COMMON_SCHEMA = {
  projectRoot: z.string().describe('Absolute project root path.'),
  branchName: z
    .string()
    .min(1)
    .describe('Branch the review state is keyed by.'),
};

const REVIEW_STATE_INPUT_SCHEMA = z.discriminatedUnion('action', [
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.PREPARE),
    baseRef: z.string().min(1),
    force: z.boolean().optional(),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.CHECKPOINT),
    baseRef: z.string().min(1).optional(),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.SEAL),
    baseRef: z.string().min(1).optional(),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.CLEANUP),
    confirm: z.literal(true),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.ASSESS),
    baseRef: z.string().min(1).optional(),
    hasPullRequest: z.boolean().optional(),
  }),
]);

const REVIEW_STATE_ADVERTISED_INPUT_SCHEMA = z.object({
  ...REVIEW_STATE_COMMON_SCHEMA,
  action: z
    .nativeEnum(REVIEW_STATE_ACTIONS)
    .describe(
      'prepare opens or resumes a run; checkpoint re-checks source identity; ' +
        'seal finalizes the verdict; cleanup deletes this branch state; ' +
        'assess reports where the merge-track cycle resumes and how the dirty ' +
        'worktree classifies, without reading or writing review state.',
    ),
  hasPullRequest: z
    .boolean()
    .optional()
    .describe(
      'assess only: whether a pull request exists. Supplied by the caller — ' +
        'this tool performs no PR operations. Omitted means no PR.',
    ),
  baseRef: z
    .string()
    .min(1)
    .optional()
    .describe('Comparison base ref. Required by prepare.'),
  force: z
    .boolean()
    .optional()
    .describe('prepare only: discard existing unsealed artifacts first.'),
  confirm: z
    .literal(true)
    .optional()
    .describe('cleanup only: required, since cleanup deletes artifacts.'),
});

const MCP_SERVER_INFO = {
  name: MCP_SERVER_NAME,
  version: VERSION,
};

const PROJECT_INIT_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.PROJECT_INIT,
  inputSchema: deferInputValidation(PROJECT_INIT_INPUT_SCHEMA),
};

const RULE_DOCS_SYNC_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.RULE_DOCS_SYNC,
  inputSchema: deferInputValidation(RULE_DOCS_SYNC_INPUT_SCHEMA),
};

const OPEN_SETTINGS_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.OPEN_SETTINGS,
  inputSchema: deferInputValidation(OPEN_SETTINGS_INPUT_SCHEMA),
};

const FRACTAL_SCAN_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.FRACTAL_SCAN,
  inputSchema: deferInputValidation(FRACTAL_SCAN_INPUT_SCHEMA),
};

const CONTEXT_RESOLVE_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.CONTEXT_RESOLVE,
  inputSchema: deferInputValidation(CONTEXT_RESOLVE_INPUT_SCHEMA),
};

const RESTRUCTURE_PLAN_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.RESTRUCTURE_PLAN,
  inputSchema: deferInputValidation(RESTRUCTURE_PLAN_INPUT_SCHEMA),
};

const STRUCTURE_VALIDATE_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.STRUCTURE_VALIDATE,
  inputSchema: deferInputValidation(STRUCTURE_VALIDATE_ADVERTISED_INPUT_SCHEMA),
};

const VERIFICATION_SCAN_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.VERIFICATION_SCAN,
  inputSchema: deferInputValidation(VERIFICATION_SCAN_INPUT_SCHEMA),
};

const REVIEW_STATE_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.REVIEW_STATE,
  inputSchema: deferInputValidation(REVIEW_STATE_ADVERTISED_INPUT_SCHEMA),
};

const PROJECT_INIT_HANDLER = wrapHandler(
  McpToolName.PROJECT_INIT,
  PROJECT_INIT_INPUT_SCHEMA,
  handleProjectInitTool,
);

const RULE_DOCS_SYNC_HANDLER = wrapHandler(
  McpToolName.RULE_DOCS_SYNC,
  RULE_DOCS_SYNC_INPUT_SCHEMA,
  handleRuleDocsSyncTool,
);

const OPEN_SETTINGS_HANDLER = wrapHandler(
  McpToolName.OPEN_SETTINGS,
  OPEN_SETTINGS_INPUT_SCHEMA,
  handleOpenSettingsTool,
);

const FRACTAL_SCAN_HANDLER = wrapHandler(
  McpToolName.FRACTAL_SCAN,
  FRACTAL_SCAN_INPUT_SCHEMA,
  handleFractalScan,
);

const CONTEXT_RESOLVE_HANDLER = wrapHandler(
  McpToolName.CONTEXT_RESOLVE,
  CONTEXT_RESOLVE_INPUT_SCHEMA,
  handleContextResolve,
);

const RESTRUCTURE_PLAN_HANDLER = wrapHandler(
  McpToolName.RESTRUCTURE_PLAN,
  RESTRUCTURE_PLAN_INPUT_SCHEMA,
  handleRestructurePlan,
);

const STRUCTURE_VALIDATE_HANDLER = wrapHandler(
  McpToolName.STRUCTURE_VALIDATE,
  STRUCTURE_VALIDATE_INPUT_SCHEMA,
  handleStructureValidate,
);

const VERIFICATION_SCAN_HANDLER = wrapHandler(
  McpToolName.VERIFICATION_SCAN,
  VERIFICATION_SCAN_INPUT_SCHEMA,
  handleVerificationScan,
);

const REVIEW_STATE_HANDLER = wrapHandler(
  McpToolName.REVIEW_STATE,
  REVIEW_STATE_INPUT_SCHEMA,
  handleReviewState,
);

export function createServer(): McpServer {
  const server = new McpServer(MCP_SERVER_INFO);

  server.registerTool(
    McpToolName.PROJECT_INIT,
    PROJECT_INIT_TOOL_CONFIG,
    PROJECT_INIT_HANDLER,
  );
  server.registerTool(
    McpToolName.RULE_DOCS_SYNC,
    RULE_DOCS_SYNC_TOOL_CONFIG,
    RULE_DOCS_SYNC_HANDLER,
  );
  server.registerTool(
    McpToolName.OPEN_SETTINGS,
    OPEN_SETTINGS_TOOL_CONFIG,
    OPEN_SETTINGS_HANDLER,
  );
  server.registerTool(
    McpToolName.FRACTAL_SCAN,
    FRACTAL_SCAN_TOOL_CONFIG,
    FRACTAL_SCAN_HANDLER,
  );
  server.registerTool(
    McpToolName.CONTEXT_RESOLVE,
    CONTEXT_RESOLVE_TOOL_CONFIG,
    CONTEXT_RESOLVE_HANDLER,
  );
  server.registerTool(
    McpToolName.RESTRUCTURE_PLAN,
    RESTRUCTURE_PLAN_TOOL_CONFIG,
    RESTRUCTURE_PLAN_HANDLER,
  );
  server.registerTool(
    McpToolName.STRUCTURE_VALIDATE,
    STRUCTURE_VALIDATE_TOOL_CONFIG,
    STRUCTURE_VALIDATE_HANDLER,
  );
  server.registerTool(
    McpToolName.VERIFICATION_SCAN,
    VERIFICATION_SCAN_TOOL_CONFIG,
    VERIFICATION_SCAN_HANDLER,
  );
  server.registerTool(
    McpToolName.REVIEW_STATE,
    REVIEW_STATE_TOOL_CONFIG,
    REVIEW_STATE_HANDLER,
  );

  return server;
}
