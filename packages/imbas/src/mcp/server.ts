/**
 * @file server.ts
 * @description imbas MCP server — tool registration + routing
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { VERSION } from '../version.js';
import { RunTransitionSchema } from '../types/state.js';
import { CacheTypeSchema } from '../types/cache.js';

import { wrapHandler } from './shared.js';

import { handleImbasPing } from './tools/imbas-ping.js';
import { handleRunCreate } from './tools/run-create.js';
import { handleRunGet } from './tools/run-get.js';
import { handleRunTransition } from './tools/run-transition.js';
import { handleRunList } from './tools/run-list.js';
import { handleManifestGet } from './tools/manifest-get.js';
import { handleManifestSave } from './tools/manifest-save.js';
import { handleManifestValidate } from './tools/manifest-validate.js';
import { handleManifestPlan } from './tools/manifest-plan.js';
import { handleConfigGet } from './tools/config-get.js';
import { handleConfigSet } from './tools/config-set.js';
import { handleCacheGet } from './tools/cache-get.js';
import { handleCacheSet } from './tools/cache-set.js';
import { handleAstSearch } from './tools/ast-search.js';
import { handleAstAnalyze } from './tools/ast-analyze.js';

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
    'imbas_ping',
    {
      description: 'Health check — returns server status and version',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleImbasPing),
  );

  // --- Pipeline: run ---

  server.registerTool(
    'imbas_run_create',
    {
      description: 'Create run directory and state.json',
      inputSchema: z.object({
        project_key: z.string(),
        source_file: z.string(),
        supplements: z.array(z.string()).optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleRunCreate),
  );

  server.registerTool(
    'imbas_run_get',
    {
      description: 'Read state.json for a run',
      inputSchema: z.object({
        project_key: z.string().optional(),
        run_id: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleRunGet),
  );

  server.registerTool(
    'imbas_run_transition',
    {
      description: 'Typed phase transition (start/complete/escape)',
      inputSchema: RunTransitionSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleRunTransition),
  );

  server.registerTool(
    'imbas_run_list',
    {
      description: 'List runs for a project',
      inputSchema: z.object({
        project_key: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleRunList),
  );

  // --- Manifest tools ---

  server.registerTool(
    'imbas_manifest_get',
    {
      description: 'Load manifest with summary',
      inputSchema: z.object({
        project_key: z.string(),
        run_id: z.string(),
        type: z.enum(['stories', 'devplan']),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleManifestGet),
  );

  server.registerTool(
    'imbas_manifest_save',
    {
      description: 'Save manifest (full replace)',
      inputSchema: z.object({
        project_key: z.string(),
        run_id: z.string(),
        type: z.enum(['stories', 'devplan']),
        manifest: z.unknown().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleManifestSave),
  );

  server.registerTool(
    'imbas_manifest_validate',
    {
      description: 'Validate manifest structure',
      inputSchema: z.object({
        project_key: z.string(),
        run_id: z.string(),
        type: z.enum(['stories', 'devplan']),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleManifestValidate),
  );

  server.registerTool(
    'imbas_manifest_plan',
    {
      description: 'Execution plan from devplan manifest',
      inputSchema: z.object({
        project_key: z.string(),
        run_id: z.string(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleManifestPlan),
  );

  // --- Config tools ---

  server.registerTool(
    'imbas_config_get',
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
    'imbas_config_set',
    {
      description: 'Update config.json fields',
      inputSchema: z.object({
        updates: z.record(z.string(), z.unknown()),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleConfigSet),
  );

  // --- Cache tools ---

  server.registerTool(
    'imbas_cache_get',
    {
      description: 'Read Jira metadata cache',
      inputSchema: z.object({
        project_key: z.string().optional(),
        cache_type: CacheTypeSchema.optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleCacheGet),
  );

  server.registerTool(
    'imbas_cache_set',
    {
      description: 'Write Jira metadata cache',
      inputSchema: z.object({
        project_key: z.string(),
        cache_type: CacheTypeSchema,
        data: z.unknown().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    wrapHandler(handleCacheSet),
  );

  // --- AST tools ---

  server.registerTool(
    'imbas_ast_search',
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
    'imbas_ast_analyze',
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
