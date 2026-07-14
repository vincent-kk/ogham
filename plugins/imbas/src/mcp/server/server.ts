/**
 * @file server.ts
 * @description imbas MCP server — tool registration + routing
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { McpToolName } from '../../constants/mcpToolNames.js';
import { CacheTypeSchema } from '../../types/index.js';
import { VERSION } from '../../version.js';
import { wrapHandler } from '../shared/index.js';
import {
  handleAstAnalyze,
  handleAstSearch,
  handleCacheGet,
  handleCacheSet,
  handleConfigGet,
  handleConfigSet,
  handleImbasPing,
  handleManifestGet,
  handleManifestImplementPlan,
  handleManifestPlan,
  handleManifestSave,
  handleManifestValidate,
  handleRunCreate,
  handleRunGet,
  handleRunList,
  handleRunTransition,
} from '../tools/index.js';

const projectRootInput = z
  .string()
  .optional()
  .describe(
    'Absolute path of the workspace directory. Omit on Claude Code, where this server already runs from the workspace; required on hosts that launch it from the plugin install directory.',
  );

/**
 * Create and configure the MCP server with all tool registrations.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'imbas',
    version: VERSION,
  });

  // --- Pipeline: ping ---

  server.registerTool(
    McpToolName.PING,
    {
      description: 'Health check — returns server status and version',
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleImbasPing),
  );

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
    McpToolName.MANIFEST_GET,
    {
      description: 'Load manifest with summary',
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
    wrapHandler(handleManifestGet),
  );

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

  server.registerTool(
    McpToolName.MANIFEST_PLAN,
    {
      description: 'Execution plan from devplan manifest',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleManifestPlan),
  );

  server.registerTool(
    McpToolName.MANIFEST_IMPLEMENT_PLAN,
    {
      description:
        'Build DAG-based implementation schedule (groups with parallel+order) from stories/devplan manifests',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
        batch: z.string().optional(),
        source: z.enum(['stories', 'devplan']).optional(),
        max_parallel: z.number().int().positive().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleManifestImplementPlan),
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
      description: 'Update config.json fields',
      inputSchema: z.object({
        // Config values are heterogeneous (string, number, object) — z.unknown()
        // allows any JSON value. Handler validates via dot-path resolution.
        updates: z.record(z.string(), z.unknown()),
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

  // --- Cache tools ---

  server.registerTool(
    McpToolName.CACHE_GET,
    {
      description: 'Read issue tracker metadata cache',
      inputSchema: z.object({
        project_ref: z.string().optional(),
        cache_type: CacheTypeSchema.optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleCacheGet),
  );

  server.registerTool(
    McpToolName.CACHE_SET,
    {
      description: 'Write issue tracker metadata cache',
      inputSchema: z.object({
        project_ref: z.string(),
        cache_type: CacheTypeSchema,
        // Cache data varies by type (jira metadata, issue types, etc.) — z.unknown()
        // is intentional. Handler validates via CacheTypeSchema for the type field.
        data: z.unknown().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleCacheSet),
  );

  // --- AST tools ---

  server.registerTool(
    McpToolName.AST_SEARCH,
    {
      description: 'AST pattern search via @ast-grep/napi',
      inputSchema: z.object({
        pattern: z.string(),
        language: z.string(),
        path: z.string().optional(),
        context: z.number().int().nonnegative().optional(),
        max_results: z.number().int().positive().optional(),
        project_root: projectRootInput,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleAstSearch, { checkErrorField: true }),
  );

  server.registerTool(
    McpToolName.AST_ANALYZE,
    {
      description: 'Dependency graph / cyclomatic complexity',
      inputSchema: z.object({
        source: z.string(),
        file_path: z.string().optional(),
        analysis_type: z.enum([
          'dependency-graph',
          'cyclomatic-complexity',
          'full',
        ]),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleAstAnalyze, { checkErrorField: true }),
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
