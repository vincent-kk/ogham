/**
 * @file server.ts
 * @description imbas MCP server — tool registration + routing
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { VERSION } from '../../version.js';
import { CacheTypeSchema } from '../../types/index.js';

import { wrapHandler } from '../shared/index.js';

import {
  handleImbasPing,
  handleRunCreate,
  handleRunGet,
  handleRunTransition,
  handleRunList,
  handleManifestGet,
  handleManifestSave,
  handleManifestValidate,
  handleManifestPlan,
  handleConfigGet,
  handleConfigSet,
  handleCacheGet,
  handleCacheSet,
  handleAstSearch,
  handleAstAnalyze,
} from '../tools/index.js';

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
    'ping',
    {
      description: 'Health check — returns server status and version',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleImbasPing),
  );

  // --- Pipeline: run ---

  server.registerTool(
    'run_create',
    {
      description: 'Create run directory and state.json',
      inputSchema: z.object({
        project_ref: z.string(),
        source_file: z.string(),
        supplements: z.array(z.string()).optional(),
        source_issue_ref: z.string().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleRunCreate),
  );

  server.registerTool(
    'run_get',
    {
      description: 'Read state.json for a run',
      inputSchema: z.object({
        project_ref: z.string().optional(),
        run_id: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleRunGet),
  );

  server.registerTool(
    'run_transition',
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
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleRunTransition),
  );

  server.registerTool(
    'run_list',
    {
      description: 'List runs for a project',
      inputSchema: z.object({
        project_ref: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleRunList),
  );

  // --- Manifest tools ---

  server.registerTool(
    'manifest_get',
    {
      description: 'Load manifest with summary',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
        type: z.enum(['stories', 'devplan']),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleManifestGet),
  );

  server.registerTool(
    'manifest_save',
    {
      description: 'Save manifest (full replace)',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
        type: z.enum(['stories', 'devplan']),
        // Type-dependent schema (stories vs devplan) — cannot express conditional
        // validation in a single MCP inputSchema. Handler validates internally via
        // StoriesManifestSchema.parse() / DevplanManifestSchema.parse().
        manifest: z.unknown().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleManifestSave),
  );

  server.registerTool(
    'manifest_validate',
    {
      description: 'Validate manifest structure',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
        type: z.enum(['stories', 'devplan']),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleManifestValidate),
  );

  server.registerTool(
    'manifest_plan',
    {
      description: 'Execution plan from devplan manifest',
      inputSchema: z.object({
        project_ref: z.string(),
        run_id: z.string(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleManifestPlan),
  );

  // --- Config tools ---

  server.registerTool(
    'config_get',
    {
      description: 'Read config.json',
      inputSchema: z.object({
        field: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleConfigGet),
  );

  server.registerTool(
    'config_set',
    {
      description: 'Update config.json fields',
      inputSchema: z.object({
        // Config values are heterogeneous (string, number, object) — z.unknown()
        // allows any JSON value. Handler validates via dot-path resolution.
        updates: z.record(z.string(), z.unknown()),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleConfigSet),
  );

  // --- Cache tools ---

  server.registerTool(
    'cache_get',
    {
      description: 'Read Jira metadata cache',
      inputSchema: z.object({
        project_ref: z.string().optional(),
        cache_type: CacheTypeSchema.optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleCacheGet),
  );

  server.registerTool(
    'cache_set',
    {
      description: 'Write Jira metadata cache',
      inputSchema: z.object({
        project_ref: z.string(),
        cache_type: CacheTypeSchema,
        // Cache data varies by type (jira metadata, issue types, etc.) — z.unknown()
        // is intentional. Handler validates via CacheTypeSchema for the type field.
        data: z.unknown().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleCacheSet),
  );

  // --- AST tools ---

  server.registerTool(
    'ast_search',
    {
      description: 'AST pattern search via @ast-grep/napi',
      inputSchema: z.object({
        pattern: z.string(),
        language: z.string(),
        path: z.string().optional(),
        context: z.number().int().nonnegative().optional(),
        max_results: z.number().int().positive().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleAstSearch, { checkErrorField: true }),
  );

  server.registerTool(
    'ast_analyze',
    {
      description: 'Dependency graph / cyclomatic complexity',
      inputSchema: z.object({
        source: z.string(),
        file_path: z.string().optional(),
        analysis_type: z.enum(['dependency-graph', 'cyclomatic-complexity', 'full']),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
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
