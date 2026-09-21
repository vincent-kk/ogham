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
import {
  FACTS_ACTIONS,
  FACTS_DECISIONS,
  FACTS_OUTPUT_REQUIREMENT,
  FACTS_REFERENCE_KINDS,
} from '../../../constants/facts.js';
import { McpToolName } from '../../../constants/mcpToolNames.js';
import { CONTRACT_INTENTS } from '../../../constants/restructure.js';
import {
  REVIEW_DEFAULT_EFFORT,
  REVIEW_EFFORT_ROUNDS,
  REVIEW_HANDOFF_DOCUMENT_SYNC_STATES,
  REVIEW_STATE_ACTIONS,
  REVIEW_VALIDATE_KINDS,
} from '../../../constants/reviewState.js';
import { VERSION } from '../../../version.js';
import type { FactsResult } from '../../tools/facts/index.js';
import type { FractalInspectResult } from '../../tools/fractalInspect/index.js';
import {
  handleFacts,
  handleFractalInspect,
  handleProjectSetup,
  handleRestructure,
  handleReviewState,
} from '../../tools/index.js';
import type { ProjectSetupResult } from '../../tools/projectSetup/index.js';
import type { RestructureResult } from '../../tools/restructure/index.js';
import {
  REVIEW_HANDOFF_CALLER_ENTRY_SCHEMA,
  type ReviewStateResult,
} from '../../tools/reviewState/index.js';
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
      .nativeEnum({ ...FRACTAL_SCAN_DETAILS, ...VERIFICATION_SCAN_DETAILS })
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
    .optional()
    .describe(
      'Branch the review state is keyed by; defaults to the current Git branch.',
    ),
};

const REVIEW_STATE_INPUT_SCHEMA = z.discriminatedUnion('action', [
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.PREPARE),
    baseRef: z.string().min(1).optional(),
    changeContext: z.string().optional(),
    changeContextPath: z.string().min(1).optional(),
    userInstructions: z.string().optional(),
    force: z.boolean().optional(),
    effort: z
      .enum([
        REVIEW_DEFAULT_EFFORT,
        ...(Object.keys(
          REVIEW_EFFORT_ROUNDS,
        ) as (keyof typeof REVIEW_EFFORT_ROUNDS)[]),
      ])
      .optional(),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.HANDOFF),
    baseRef: z.string().min(1).optional(),
    documentSync: z.enum(REVIEW_HANDOFF_DOCUMENT_SYNC_STATES),
    repaired: z.number().int().nonnegative(),
    entries: z.array(REVIEW_HANDOFF_CALLER_ENTRY_SCHEMA).optional(),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.CHECKPOINT),
    baseRef: z.string().min(1).optional(),
  }),
  z.object({
    ...REVIEW_STATE_COMMON_SCHEMA,
    action: z.literal(REVIEW_STATE_ACTIONS.VALIDATE),
    kind: z.nativeEnum(REVIEW_VALIDATE_KINDS),
    group: z.string().regex(/^\d{2,}$/),
    round: z.number().int().min(1).optional(),
    generationId: z
      .string()
      .regex(/^[a-f0-9]{32}$/)
      .optional()
      .describe(
        'Generation the handoff came from; a replaced generation is refused.',
      ),
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
  userInstructions: z
    .string()
    .optional()
    .describe(
      'prepare only: explicit user review requirements, compared for the files that consume them.',
    ),
  ...REVIEW_STATE_COMMON_SCHEMA,
  action: z
    .nativeEnum(REVIEW_STATE_ACTIONS)
    .describe(
      'prepare opens or resumes a run; checkpoint re-checks source identity; ' +
        'validate checks one review or verification opinion; seal folds and ' +
        'renders the verdict; cleanup deletes this branch state; ' +
        'handoff generates the bounded PR handoff section; ' +
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
    .describe(
      'Comparison base ref; prepare and handoff resolve remote HEAD, remote defaults, then local main or master when omitted.',
    ),
  changeContext: z
    .string()
    .optional()
    .describe(
      'prepare only: untrusted change summary; defaults to commit subjects and diff totals.',
    ),
  changeContextPath: z
    .string()
    .min(1)
    .optional()
    .describe(
      'prepare only: absolute file path whose contents replace changeContext; mutually exclusive with changeContext.',
    ),
  documentSync: z
    .enum(REVIEW_HANDOFF_DOCUMENT_SYNC_STATES)
    .optional()
    .describe('handoff only: Stage 1 document synchronization outcome.'),
  repaired: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('handoff only: number of documents repaired during Stage 1.'),
  entries: z
    .array(REVIEW_HANDOFF_CALLER_ENTRY_SCHEMA)
    .optional()
    .describe('handoff only: additional Stage 1 claims bounded when recorded.'),
  force: z
    .boolean()
    .optional()
    .describe(
      'prepare only: review all files in a fresh generation while preserving previous artifacts.',
    ),
  effort: z
    .enum([
      REVIEW_DEFAULT_EFFORT,
      ...(Object.keys(
        REVIEW_EFFORT_ROUNDS,
      ) as (keyof typeof REVIEW_EFFORT_ROUNDS)[]),
    ])
    .optional()
    .describe(
      'prepare only: auto selects low at the configured group threshold, otherwise medium; low/medium/high cap reviewer rounds at 1/2/3. Explicit input overrides config.',
    ),
  kind: z
    .nativeEnum(REVIEW_VALIDATE_KINDS)
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
  generationId: z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .optional()
    .describe(
      'validate only: the generationId of the handoff this opinion answers; an opinion from a generation a later prepare replaced is refused instead of merged.',
    ),
  confirm: z
    .literal(true)
    .optional()
    .describe('cleanup only: required, since cleanup deletes artifacts.'),
});

const FACTS_FILE_SCHEMA = z
  .string()
  .describe(
    `submit only: absolute path of the extraction output, a JSON array of FileFacts records. The path is resolved through any symbolic links and its real location must be a regular file outside the project tree. ${FACTS_OUTPUT_REQUIREMENT}`,
  );
const FACTS_EPOCH_SCHEMA = z
  .string()
  .describe(
    'submit only: the resolutionEpoch the batch was extracted against, as facts status returned it. A stale value stores nothing and returns the current epoch with the paths that moved.',
  );

const FACTS_SOURCE_PATH_SCHEMA = z
  .string()
  .min(1)
  .describe(
    'adjudicate only: project-relative POSIX path of the file being judged.',
  );
const FACTS_SOURCE_PATHS_SCHEMA = z
  .array(z.string().min(1))
  .min(1)
  .describe(
    'discard-pending only: project-relative POSIX paths whose unconfirmed attested submission to drop. Stored records and the adjudication side table are untouched.',
  );
const FACTS_SHARDS_SCHEMA = z
  .array(z.string().regex(/^[0-9a-f]+\.json$/))
  .min(1)
  .describe(
    'discard-damaged only: shard file names exactly as the judgements diagnostic reported them. Only a shard the store currently reads as unparseable is dropped; a readable one is refused by name.',
  );
const FACTS_ACTOR_SCHEMA = z
  .string()
  .min(1)
  .describe(
    'Who is claiming. Self-declared — the server cannot verify it. Required by adjudicate, and by submit when the batch carries an attested record, because both are confirmed only by a DIFFERENT actor.',
  );
const FACTS_ITEMS_SCHEMA = z
  .array(
    z.object({
      kind: z.nativeEnum(FACTS_REFERENCE_KINDS),
      reference: z
        .string()
        .min(1)
        .describe('The reference string exactly as the item reports it.'),
      resolvedPath: z
        .string()
        .min(1)
        .describe('The in-project path the item says the reference resolves to.'),
      decision: z.nativeEnum(FACTS_DECISIONS),
      reason: z
        .string()
        .min(1)
        .optional()
        .describe('Required for dismiss: why that edge is not there.'),
    }),
  )
  .min(1)
  .describe('adjudicate only: one decision per side-table item.');

const FACTS_INPUT_SCHEMA = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal(FACTS_ACTIONS.STATUS),
      path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
    })
    .strict(),
  z
    .object({
      action: z.literal(FACTS_ACTIONS.SUBMIT),
      path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
      file: FACTS_FILE_SCHEMA,
      resolutionEpoch: FACTS_EPOCH_SCHEMA,
      actor: FACTS_ACTOR_SCHEMA.optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal(FACTS_ACTIONS.DISCARD_PENDING),
      path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
      sourcePaths: FACTS_SOURCE_PATHS_SCHEMA,
    })
    .strict(),
  z
    .object({
      action: z.literal(FACTS_ACTIONS.DISCARD_DAMAGED),
      path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
      shards: FACTS_SHARDS_SCHEMA,
    })
    .strict(),
  z
    .object({
      action: z.literal(FACTS_ACTIONS.COMPARE),
      path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
      file: FACTS_FILE_SCHEMA,
      generationId: z
        .string()
        .regex(/^[a-f0-9]{32}$/)
        .optional()
        .describe(
          'compare only: review generation whose frozen facts to compare against, as its handoff reported it. Omit it to compare against the live store.',
        ),
    })
    .strict(),
  z
    .object({
      action: z.literal(FACTS_ACTIONS.ADJUDICATE),
      path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
      sourcePath: FACTS_SOURCE_PATH_SCHEMA,
      contentHash: z
        .string()
        .min(1)
        .describe(
          'adjudicate only: the sourcePath bytes this judgement was made against. A judgement made against other bytes is refused.',
        ),
      actor: FACTS_ACTOR_SCHEMA,
      items: FACTS_ITEMS_SCHEMA,
    })
    .strict(),
]);

const FACTS_ADVERTISED_INPUT_SCHEMA = z.object({
  action: z
    .nativeEnum(FACTS_ACTIONS)
    .describe(
      'status reports which files filid holds facts for and what it is waiting for; submit takes one batch of extracted facts and replaces the records for the files it carries; compare checks an independently extracted candidate against the store without storing it; adjudicate settles the disagreements compare recorded; discard-pending drops an unconfirmed attested submission so a file two readers keep answering differently can be started over; discard-damaged drops a judgement shard whose JSON the store cannot read, which nothing else can write.',
    ),
  path: z.string().describe(PROJECT_ROOT_DESCRIPTION),
  file: FACTS_FILE_SCHEMA.optional(),
  resolutionEpoch: FACTS_EPOCH_SCHEMA.optional(),
  generationId: z
    .string()
    .regex(/^[a-f0-9]{32}$/)
    .optional()
    .describe(
      'compare only: review generation whose frozen facts to compare against.',
    ),
  sourcePath: FACTS_SOURCE_PATH_SCHEMA.optional(),
  sourcePaths: FACTS_SOURCE_PATHS_SCHEMA.optional(),
  shards: FACTS_SHARDS_SCHEMA.optional(),
  contentHash: z
    .string()
    .min(1)
    .optional()
    .describe(
      'adjudicate only: the sourcePath bytes this judgement was made against.',
    ),
  actor: FACTS_ACTOR_SCHEMA.optional(),
  items: FACTS_ITEMS_SCHEMA.optional(),
});

/**
 * The two schemas each tool has: what it advertises to callers, and what its
 * actions actually read.
 *
 * The advertised schema is what `registerTool` validates with, and it strips
 * unknown keys, so an argument an action reads but the advertised object omits
 * never reaches the handler. A contract test compares the two per tool, which
 * is why this pairing is exported.
 */
export const MCP_TOOL_INPUT_SCHEMAS = [
  {
    tool: McpToolName.PROJECT_SETUP,
    advertised: PROJECT_SETUP_ADVERTISED_INPUT_SCHEMA,
    internal: PROJECT_SETUP_INPUT_SCHEMA,
  },
  {
    tool: McpToolName.FRACTAL_INSPECT,
    advertised: FRACTAL_INSPECT_ADVERTISED_INPUT_SCHEMA,
    internal: FRACTAL_INSPECT_INPUT_SCHEMA,
  },
  {
    tool: McpToolName.RESTRUCTURE,
    advertised: RESTRUCTURE_ADVERTISED_INPUT_SCHEMA,
    internal: RESTRUCTURE_INPUT_SCHEMA,
  },
  {
    tool: McpToolName.REVIEW_STATE,
    advertised: REVIEW_STATE_ADVERTISED_INPUT_SCHEMA,
    internal: REVIEW_STATE_INPUT_SCHEMA,
  },
  {
    tool: McpToolName.FACTS,
    advertised: FACTS_ADVERTISED_INPUT_SCHEMA,
    internal: FACTS_INPUT_SCHEMA,
  },
] as const;

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

const FACTS_TOOL_CONFIG = {
  description: MCP_TOOL_DESCRIPTIONS.FACTS,
  inputSchema: deferInputValidation(FACTS_ADVERTISED_INPUT_SCHEMA),
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

/** Wrapped facts handler registered as the two-action submitted-facts surface. */
const FACTS_HANDLER = wrapHandler<
  typeof FACTS_INPUT_SCHEMA,
  FactsResult['summary'],
  FactsResult['data']
>(McpToolName.FACTS, FACTS_INPUT_SCHEMA, (input) => handleFacts(input));

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
  server.registerTool(McpToolName.FACTS, FACTS_TOOL_CONFIG, FACTS_HANDLER);

  return server;
}
