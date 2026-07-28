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

import { handleOpenSettingsTool } from '../handlers/handleOpenSettingsTool.js';
import { handleProjectInitTool } from '../handlers/handleProjectInitTool.js';
import { handleRuleDocsSyncTool } from '../handlers/handleRuleDocsSyncTool.js';
import { deferInputValidation } from '../utils/deferInputValidation.js';
import { wrapHandler } from '../envelope/wrapHandler.js';

const PROJECT_INIT_INPUT_SCHEMA = z.object({
  path: z.string().optional(),
  language: z.string().optional(),
  adapterIds: z.array(z.string().min(1)).min(1).optional(),
});

const RULE_DOCS_SYNC_INPUT_SCHEMA = z.object({
  action: z.nativeEnum(RULE_DOC_ACTIONS),
  path: z.string(),
  selections: z
    .union([z.record(z.string(), z.boolean()), z.string()])
    .nullish(),
  resync: z.union([z.array(z.string()), z.string()]).nullish(),
});

const OPEN_SETTINGS_INPUT_SCHEMA = z.object({
  path: z.string().optional(),
  waitSeconds: z.number().positive().optional(),
});

const FRACTAL_SCAN_INPUT_SCHEMA = z.object({
  path: z.string(),
  depth: z.number().int().nonnegative().optional(),
  detail: z.nativeEnum(FRACTAL_SCAN_DETAILS).optional(),
});

const CONTEXT_RESOLVE_INPUT_SCHEMA = z.object({
  path: z.string(),
  targetPath: z.string(),
});

const RESTRUCTURE_PLAN_INPUT_SCHEMA = z.object({
  path: z.string(),
  requests: z.array(
    z.object({
      sourcePath: z.string(),
      consumerPaths: z.array(z.string()).optional(),
      contractIntent: z.nativeEnum(CONTRACT_INTENTS).optional(),
      organNameHint: z.string().optional(),
    }),
  ),
});

const STRUCTURE_VALIDATION_COMMON_SCHEMA = {
  path: z.string(),
  scopes: z.array(z.nativeEnum(STRUCTURE_VALIDATION_SCOPES)).optional(),
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
  mode: z.nativeEnum(STRUCTURE_VALIDATION_MODES).optional(),
  planPath: z.string().optional(),
});

const VERIFICATION_SCAN_INPUT_SCHEMA = z.object({
  path: z.string(),
  filePaths: z.array(z.string()).optional(),
  detail: z.nativeEnum(VERIFICATION_SCAN_DETAILS).optional(),
});

const REVIEW_STATE_COMMON_SCHEMA = {
  projectRoot: z.string(),
  branchName: z.string().min(1),
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
]);

const REVIEW_STATE_ADVERTISED_INPUT_SCHEMA = z.object({
  ...REVIEW_STATE_COMMON_SCHEMA,
  action: z.nativeEnum(REVIEW_STATE_ACTIONS),
  baseRef: z.string().min(1).optional(),
  force: z.boolean().optional(),
  confirm: z.literal(true).optional(),
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
