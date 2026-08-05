/**
 * @file server.ts
 * @description imbas MCP server — tool registration + routing
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PROJECT_ROOT_ARG_DESCRIPTION } from '@ogham/cross-platform';
import { z } from 'zod';

import { McpToolName } from '../../constants/mcpToolNames.js';
import { SettingsBootstrapSchema } from '../../types/index.js';
import { VERSION } from '../../version.js';
import { wrapHandler } from '../shared/index.js';
import {
  handleConfigGet,
  handleConfigSet,
  handleManifestSave,
  handleManifestValidate,
  handleOpenSettings,
  handleRunCreate,
  handleRunGet,
  handleRunList,
  handleRunTransition,
} from '../tools/index.js';

const projectRootInput = z
  .string()
  .optional()
  .describe(PROJECT_ROOT_ARG_DESCRIPTION);

/**
 * Create and configure the MCP server with all tool registrations.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'imbas',
    version: VERSION,
  });

  // --- Pipeline: run ---

  server.registerTool(
    McpToolName.RUN_CREATE,
    {
      description: 'Create run directory and state.json',
      inputSchema: z.object({
        project_ref: z.string(),
        source_file: z.string(),
        supplements: z.array(z.string()).optional(),
        source_issue_ref: z.string().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleRunCreate),
  );

  server.registerTool(
    McpToolName.RUN_GET,
    {
      description: 'Read state.json for a run',
      inputSchema: z.object({
        project_ref: z.string().optional(),
        run_id: z.string().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleRunGet),
  );

  server.registerTool(
    McpToolName.RUN_TRANSITION,
    {
      // Flat leaf-primitive schema to avoid zod-to-json-schema $ref dedup.
      // Handler validates via RunTransitionSchema.parse(). See manifest_save above.
      description: 'Typed phase transition (start/complete/escape/skip)',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
        action: z.string(),
        phase: z.string().optional(),
        phases: z.array(z.string()).optional(),
        escape_code: z.string().optional(),
        result: z.string().optional(),
        blocking_issues: z.number().int().nonnegative().optional(),
        warning_issues: z.number().int().nonnegative().optional(),
        pending_review: z.boolean().optional(),
        stories_created: z.number().int().nonnegative().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleRunTransition),
  );

  server.registerTool(
    McpToolName.RUN_LIST,
    {
      description: 'List runs for a project',
      inputSchema: z.object({
        project_ref: z.string().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleRunList),
  );

  // --- Manifest tools ---

  server.registerTool(
    McpToolName.MANIFEST_SAVE,
    {
      description: 'Save manifest (full replace)',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
        type: z.enum(['stories', 'devplan', 'implement-plan']),
        // Type-dependent schema (stories vs devplan) — cannot express conditional
        // validation in a single MCP inputSchema. Handler validates internally via
        // StoriesManifestSchema.parse() / DevplanManifestSchema.parse().
        manifest: z.unknown().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleManifestSave),
  );

  server.registerTool(
    McpToolName.MANIFEST_VALIDATE,
    {
      description: 'Validate manifest structure',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
        type: z.enum(['stories', 'devplan', 'implement-plan']),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleManifestValidate),
  );

  // --- Config tools ---

  server.registerTool(
    McpToolName.CONFIG_GET,
    {
      description: 'Read config.json',
      inputSchema: z.object({
        field: z.string().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleConfigGet),
  );

  server.registerTool(
    McpToolName.CONFIG_SET,
    {
      description:
        'Update config fields in one layer. scope "project" writes <cwd>/.imbas/config.json (per-workspace, overrides user); scope "user" writes the global config that every workspace inherits.',
      inputSchema: z.object({
        // Config values are heterogeneous (string, number, object) — z.unknown()
        // allows any JSON value. Handler validates via dot-path resolution.
        updates: z.record(z.string(), z.unknown()),
        scope: z
          .enum(['user', 'project'])
          .describe(
            'Which config layer to write. Required: both are valid targets.',
          ),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleConfigSet),
  );

  server.registerTool(
    McpToolName.OPEN_SETTINGS,
    {
      description:
        'Open the local imbas settings page (.imbas/config.json) in a browser and long-poll until the user saves. Returns status: saved (summary included) | closed (kept existing config) | pending (wait elapsed; page still open — call again to keep waiting). Pass session-known facts via bootstrap so the page can render provider availability and project pickers.',
      inputSchema: z.object({
        project_root: projectRootInput,
        wait_seconds: z
          .number()
          .optional()
          .describe('Bounded wait for the save event (default 300, max 600).'),
        bootstrap: SettingsBootstrapSchema.optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleOpenSettings),
  );

  return server;
}

/**
 * Start the MCP server with stdio transport.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
