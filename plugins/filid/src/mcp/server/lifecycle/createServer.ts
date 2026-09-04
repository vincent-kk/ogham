import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  FRACTAL_INSPECT_ACTIONS,
  FRACTAL_SCAN_DETAILS,
  MCP_SERVER_NAME,
  MCP_TOOL_DESCRIPTIONS,
  PROJECT_SETUP_ACTIONS,
  RESTRUCTURE_ACTIONS,
  STRUCTURE_VALIDATION_SCOPES,
  VERIFICATION_SCAN_DETAILS,
} from '../../../constants/mcpContracts.js';
import { McpToolName } from '../../../constants/mcpToolNames.js';
import { CONTRACT_INTENTS } from '../../../constants/restructure.js';
import { REVIEW_STATE_ACTIONS } from '../../../constants/reviewState.js';
import { VERSION } from '../../../version.js';
import type { FractalInspectResult } from '../../tools/fractalInspect/index.js';
import {
  handleFractalInspect,
  handleProjectSetup,
  handleRestructure,
  handleReviewState,
} from '../../tools/index.js';
import type { ProjectSetupResult } from '../../tools/projectSetup/index.js';
import type { RestructureResult } from '../../tools/restructure/index.js';
import type { ReviewStateResult } from '../../tools/reviewState/index.js';
import { wrapHandler } from '../envelope/wrapHandler.js';
import { deferInputValidation } from '../utils/deferInputValidation.js';

const PROJECT_ROOT_DESCRIPTION =
  'Absolute path used as-is as the root of this call — nothing is resolved ' +
  'upward, so passing a subdirectory scopes the work to that subtree. Project ' +
  'config (.filid/config.json) is the exception: it is always read from the ' +
  'enclosing git repository root.';

const INIT_LANGUAGE_SCHEMA = z
  .string()
  .optional()
  .describe(
    'init only: output language tag for generated documents, e.g. "ko".',
  );
const INIT_ADAPTER_IDS_SCHEMA = z
  .array(z.string().min(1))
  .min(1)
  .optional()
  .describe('init only: ecosystem adapter IDs to enable, e.g. ["ecmascript"].');
const RULE_SELECTIONS_SCHEMA = z
  .union([z.record(z.string(), z.boolean()), z.string()])
  .nullish()
  .describe('rules-sync only: rule ID to enabled flag. Omit to deploy all.');
const RULE_RESYNC_SCHEMA = z
  .union([z.array(z.string()), z.string()])
  .nullish()
  .describe(
    'rules-sync only: rule IDs to overwrite even when already deployed.',
  );
const SETTINGS_WAIT_SCHEMA = z
  .number()
  .positive()
  .optional()
  .describe('settings only: how long to wait for the browser form.');

const PROJECT_SETUP_INPUT_SCHEMA = z.discriminatedUnion('action', [
  z.object({
    action: z.literal(PROJECT_SETUP_ACTIONS.INIT),
    path: z.string().optional().describe(PROJECT_ROOT_DESCRIPTION),
    language: INIT_LANGUAGE_SCHEMA,
    adapterIds: INIT_ADAPTER_IDS_SCHEMA,
  }),
  z.object({
    action: z.literal(PROJECT_SETUP_ACTIONS.RULES_STATUS),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  }),
  z.object({
    action: z.literal(PROJECT_SETUP_ACTIONS.RULES_MANIFEST),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  }),
  z.object({
    action: z.literal(PROJECT_SETUP_ACTIONS.RULES_SYNC),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    selections: RULE_SELECTIONS_SCHEMA,
    resync: RULE_RESYNC_SCHEMA,
  }),
  z.object({
    action: z.literal(PROJECT_SETUP_ACTIONS.SETTINGS),
    path: z.string().optional().describe(PROJECT_ROOT_DESCRIPTION),
    waitSeconds: SETTINGS_WAIT_SCHEMA,
  }),
]);

const PROJECT_SETUP_ADVERTISED_INPUT_SCHEMA = z.object({
  action: z
    .nativeEnum(PROJECT_SETUP_ACTIONS)
    .describe(
      'init creates missing config; rules-status and rules-manifest inspect managed rules; rules-sync writes them; settings opens the bounded local session.',
    ),
  path: z
    .string()
    .optional()
    .describe(
      'Required by the rules-* actions; init and settings default to the enclosing repository root.',
    ),
  language: INIT_LANGUAGE_SCHEMA,
  adapterIds: INIT_ADAPTER_IDS_SCHEMA,
  selections: RULE_SELECTIONS_SCHEMA,
  resync: RULE_RESYNC_SCHEMA,
  waitSeconds: SETTINGS_WAIT_SCHEMA,
});

const SCAN_MAX_DEPTH_SCHEMA = z
  .number()
  .int()
  .nonnegative()
  .optional()
  .describe(
    'scan only: overrides the configured max-depth RULE THRESHOLD — not a traversal limit. The tree is always walked in full; lowering this only makes more nodes violate the depth rule. Omit it to use project config.',
  );
const SCAN_DETAIL_SCHEMA = z
  .nativeEnum(FRACTAL_SCAN_DETAILS)
  .optional()
  .describe(
    'scan only: summary (default) returns counts; paths adds node evidence; full adds snapshot evidence.',
  );
const SCAN_NAME_FILTER_SCHEMA = z
  .string()
  .min(1)
  .optional()
  .describe(
    'scan only: exact directory name narrowing the paths projection. Summary counts still describe the whole tree.',
  );
const VALIDATION_SCOPES_SCHEMA = z
  .array(z.nativeEnum(STRUCTURE_VALIDATION_SCOPES))
  .optional()
  .describe(
    'validate only: rule scopes to evaluate. Omit to evaluate all six.',
  );
const VERIFICATION_FILE_PATHS_SCHEMA = z
  .array(z.string())
  .optional()
  .describe(
    'verification only: files to inspect. Omit to scan the whole project.',
  );
const VERIFICATION_DETAIL_SCHEMA = z
  .nativeEnum(VERIFICATION_SCAN_DETAILS)
  .optional()
  .describe(
    'verification only: summary (default) returns role counts and caps; files adds per-file evidence.',
  );
const CONTEXT_REQUESTS_SCHEMA = z
  .array(
    z.object({
      targetPath: z
        .string()
        .describe(
          'Absolute path whose owning fractal and INTENT/DETAIL chain to resolve.',
        ),
      comparePaths: z
        .array(z.string())
        .optional()
        .describe(
          'Paths whose lowest common fractal to resolve for this target. Returns null when no single fractal owns them all.',
        ),
    }),
  )
  .min(1)
  .describe(
    'resolve only: one or more ordered target requests evaluated against one shared snapshot.',
  );

const FRACTAL_INSPECT_INPUT_SCHEMA = z.discriminatedUnion('action', [
  z.object({
    action: z.literal(FRACTAL_INSPECT_ACTIONS.SCAN),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    maxDepth: SCAN_MAX_DEPTH_SCHEMA,
    detail: SCAN_DETAIL_SCHEMA,
    nameFilter: SCAN_NAME_FILTER_SCHEMA,
  }),
  z.object({
    action: z.literal(FRACTAL_INSPECT_ACTIONS.VALIDATE),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    scopes: VALIDATION_SCOPES_SCHEMA,
  }),
  z.object({
    action: z.literal(FRACTAL_INSPECT_ACTIONS.VERIFICATION),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    filePaths: VERIFICATION_FILE_PATHS_SCHEMA,
    detail: VERIFICATION_DETAIL_SCHEMA,
  }),
  z
    .object({
      action: z.literal(FRACTAL_INSPECT_ACTIONS.RESOLVE),
      path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
      requests: CONTEXT_REQUESTS_SCHEMA,
    })
    .strict(),
]);

const FRACTAL_INSPECT_ADVERTISED_INPUT_SCHEMA = z
  .object({
    action: z
      .nativeEnum(FRACTAL_INSPECT_ACTIONS)
      .describe(
        'scan summarizes the tree; validate checks FCA structure; verification audits verification documents; resolve returns owner chains.',
      ),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    detail: z
      .enum(['summary', 'paths', 'full', 'files'])
      .optional()
      .describe(
        'scan: summary (default) | paths | full. verification: summary (default) | files.',
      ),
    maxDepth: SCAN_MAX_DEPTH_SCHEMA,
    nameFilter: SCAN_NAME_FILTER_SCHEMA,
    scopes: VALIDATION_SCOPES_SCHEMA,
    filePaths: VERIFICATION_FILE_PATHS_SCHEMA,
    requests: CONTEXT_REQUESTS_SCHEMA.optional(),
  })
  .passthrough();

const RESTRUCTURE_REQUESTS_SCHEMA = z
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
  .describe('plan only: placement requests evaluated against one snapshot.');

const RESTRUCTURE_INPUT_SCHEMA = z.discriminatedUnion('action', [
  z.object({
    action: z.literal(RESTRUCTURE_ACTIONS.PLAN),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    requests: RESTRUCTURE_REQUESTS_SCHEMA,
  }),
  z.object({
    action: z.literal(RESTRUCTURE_ACTIONS.PRECONDITION),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    planPath: z.string(),
  }),
  z.object({
    action: z.literal(RESTRUCTURE_ACTIONS.POSTCONDITION),
    path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    planPath: z.string(),
  }),
]);

const RESTRUCTURE_ADVERTISED_INPUT_SCHEMA = z.object({
  action: z
    .nativeEnum(RESTRUCTURE_ACTIONS)
    .describe(
      'plan creates a persisted read-only move plan; precondition and postcondition validate it around external execution.',
    ),
  path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  requests: RESTRUCTURE_REQUESTS_SCHEMA.optional(),
  planPath: z
    .string()
    .optional()
    .describe(
      'precondition, postcondition only: absolute plan artifact path written by plan. Required by both.',
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
    effort: z.enum(['low', 'medium', 'high']).optional(),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.CHECKPOINT),
    baseRef: z.string().min(1).optional(),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.VALIDATE),
    kind: z.enum(['review', 'verify']),
    group: z.string().regex(/^\d{2,}$/),
    round: z.number().int().min(1).optional(),
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
        'validate checks one review or verification opinion; seal folds and ' +
        'renders the verdict; cleanup deletes this branch state; ' +
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
  effort: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('prepare only: reviewer effort and maximum round count.'),
  kind: z
    .enum(['review', 'verify'])
    .optional()
    .describe('validate only: opinion kind to validate.'),
  group: z
    .string()
    .regex(/^\d{2,}$/)
    .optional()
    .describe('validate only: two-or-more digit review group ID.'),
  round: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('review validation only: one-based reviewer round.'),
  confirm: z
    .literal(true)
    .optional()
    .describe('cleanup only: required, since cleanup deletes artifacts.'),
});

const MCP_SERVER_INFO = {
  name: MCP_SERVER_NAME,
  version: VERSION,
};

const PROJECT_SETUP_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.PROJECT_SETUP,
  inputSchema: deferInputValidation(PROJECT_SETUP_ADVERTISED_INPUT_SCHEMA),
};

const FRACTAL_INSPECT_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.FRACTAL_INSPECT,
  inputSchema: deferInputValidation(FRACTAL_INSPECT_ADVERTISED_INPUT_SCHEMA),
};

const RESTRUCTURE_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.RESTRUCTURE,
  inputSchema: deferInputValidation(RESTRUCTURE_ADVERTISED_INPUT_SCHEMA),
};

const REVIEW_STATE_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.REVIEW_STATE,
  inputSchema: deferInputValidation(REVIEW_STATE_ADVERTISED_INPUT_SCHEMA),
};

/** Wrapped project-setup handler registered as the single five-action surface. */
const PROJECT_SETUP_HANDLER = wrapHandler<
  typeof PROJECT_SETUP_INPUT_SCHEMA,
  ProjectSetupResult['summary'],
  ProjectSetupResult['data']
>(McpToolName.PROJECT_SETUP, PROJECT_SETUP_INPUT_SCHEMA, (input, extra) =>
  handleProjectSetup(input, extra),
);

/** Wrapped fractal-inspection handler registered as the read-only surface. */
const FRACTAL_INSPECT_HANDLER = wrapHandler<
  typeof FRACTAL_INSPECT_INPUT_SCHEMA,
  FractalInspectResult['summary'],
  FractalInspectResult['data']
>(McpToolName.FRACTAL_INSPECT, FRACTAL_INSPECT_INPUT_SCHEMA, (input) =>
  handleFractalInspect(input),
);

/** Wrapped restructure handler registered as the three-action move surface. */
const RESTRUCTURE_HANDLER = wrapHandler<
  typeof RESTRUCTURE_INPUT_SCHEMA,
  RestructureResult['summary'],
  RestructureResult['data']
>(McpToolName.RESTRUCTURE, RESTRUCTURE_INPUT_SCHEMA, (input) =>
  handleRestructure(input),
);

/** Wrapped review-state handler registered as the single six-action MCP surface. */
const REVIEW_STATE_HANDLER = wrapHandler<
  typeof REVIEW_STATE_INPUT_SCHEMA,
  ReviewStateResult['summary'],
  ReviewStateResult['data']
>(McpToolName.REVIEW_STATE, REVIEW_STATE_INPUT_SCHEMA, (input) =>
  handleReviewState(input),
);

/**
 * Creates a Filid MCP server with every supported tool registered.
 *
 * @returns A disconnected server ready to attach to an MCP transport.
 */
export function createServer(): McpServer {
  const server = new McpServer(MCP_SERVER_INFO);

  server.registerTool(
    McpToolName.PROJECT_SETUP,
    PROJECT_SETUP_TOOL_CONFIG,
    PROJECT_SETUP_HANDLER,
  );
  server.registerTool(
    McpToolName.FRACTAL_INSPECT,
    FRACTAL_INSPECT_TOOL_CONFIG,
    FRACTAL_INSPECT_HANDLER,
  );
  server.registerTool(
    McpToolName.RESTRUCTURE,
    RESTRUCTURE_TOOL_CONFIG,
    RESTRUCTURE_HANDLER,
  );
  server.registerTool(
    McpToolName.REVIEW_STATE,
    REVIEW_STATE_TOOL_CONFIG,
    REVIEW_STATE_HANDLER,
  );

  return server;
}
