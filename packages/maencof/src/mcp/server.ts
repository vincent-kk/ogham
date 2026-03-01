/**
 * @file server.ts
 * @description maencof MCP server — registers 15 tools + routing
 *
 * Tool list:
 * CRUD x5: maencof_create, maencof_read, maencof_update, maencof_delete, maencof_move
 * Search x5: kg_search, kg_navigate, kg_context, kg_status, kg_suggest_links
 * Build x1: kg_build
 * CLAUDE.md x3: claudemd_merge, claudemd_read, claudemd_remove
 * Dailynote x1: dailynote_read
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { z } from 'zod';

import { MetadataStore } from '../index/metadata-store.js';
import type { KnowledgeGraph } from '../types/graph.js';
import { VERSION } from '../version.js';

import { toolError, toolResult } from './shared.js';
import { handleClaudeMdMerge } from './tools/claudemd-merge.js';
import { handleDailynoteRead } from './tools/dailynote-read.js';
import { handleClaudeMdRead } from './tools/claudemd-read.js';
import { handleClaudeMdRemove } from './tools/claudemd-remove.js';
import { handleKgBuild } from './tools/kg-build.js';
import { handleKgContext } from './tools/kg-context.js';
import { handleKgNavigate } from './tools/kg-navigate.js';
import { handleKgSearch } from './tools/kg-search.js';
import { handleKgStatus } from './tools/kg-status.js';
import { handleKgSuggestLinks } from './tools/kg-suggest-links.js';
import { handleMaencofCreate } from './tools/maencof-create.js';
import { handleMaencofDelete } from './tools/maencof-delete.js';
import { handleMaencofMove } from './tools/maencof-move.js';
import { handleMaencofRead } from './tools/maencof-read.js';
import { handleMaencofUpdate } from './tools/maencof-update.js';

/** Blocked prefixes for global config path access */
const BLOCKED_PREFIXES = [
  resolve(homedir(), '.claude'),
  resolve(homedir(), '.config'),
];

/**
 * vault path (from environment variable or CWD).
 * Blocks access to global config paths.
 */
function getVaultPath(): string {
  const raw = process.env['MAENCOF_VAULT_PATH'] ?? process.cwd();
  const resolved = resolve(raw);

  // Block access to global config paths
  for (const prefix of BLOCKED_PREFIXES) {
    if (resolved.startsWith(prefix)) {
      throw new Error(
        `Access to global config path is blocked: ${resolved}`,
      );
    }
  }

  return resolved;
}

/** Graph cache (preserved in memory for the server lifecycle) */
let cachedGraph: KnowledgeGraph | null = null;
let cacheVaultPath: string | null = null;

async function loadGraphIfNeeded(
  vaultPath: string,
): Promise<KnowledgeGraph | null> {
  if (cachedGraph && cacheVaultPath === vaultPath) return cachedGraph;

  const store = new MetadataStore(vaultPath);
  const graph = await store.loadGraph();
  if (graph) {
    cachedGraph = graph;
    cacheVaultPath = vaultPath;
  }
  return graph;
}

function invalidateCache(): void {
  cachedGraph = null;
  cacheVaultPath = null;
}

/**
 * Creates the maencof MCP server and registers 15 tools.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'maencof', version: VERSION });
  registerCrudTools(server);
  registerKgTools(server);
  registerClaudeMdTools(server);
  registerDailynoteTools(server);
  return server;
}

/**
 * Registers 5 CRUD tools: maencof_create, maencof_read, maencof_update, maencof_delete, maencof_move
 */
function registerCrudTools(server: McpServer): void {
  // ─── maencof_create ───────────────────────────────────────────────
  server.registerTool(
    'maencof_create',
    {
      description:
        'Creates a new memory document in the knowledge tree. Frontmatter is auto-generated when Layer(1-5) and tags are specified.',
      inputSchema: z.object({
        layer: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe(
            'Document Layer (1=Core, 2=Derived, 3=External, 4=Action, 5=Context)',
          ),
        tags: z.array(z.string()).min(1).describe('Tag list (at least 1)'),
        content: z.string().describe('Document content (markdown)'),
        title: z.string().optional().describe('Document title (optional)'),
        filename: z
          .string()
          .optional()
          .describe('Filename hint (optional, auto-generated if omitted)'),
        source: z.string().optional().describe('External source (for Layer 3)'),
        expires: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Expiry date YYYY-MM-DD (for Layer 4)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleMaencofCreate(vaultPath, {
          ...args,
          layer: args.layer as 1 | 2 | 3 | 4 | 5,
        });
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── maencof_read ────────────────────────────────────────────────
  server.registerTool(
    'maencof_read',
    {
      description:
        'Reads a document and returns Frontmatter + body. When include_related=true, also includes SA-based related documents.',
      inputSchema: z.object({
        path: z.string().describe('Document path (relative to vault)'),
        depth: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('SA hop count (default 2)'),
        include_related: z
          .boolean()
          .optional()
          .describe('Include related documents (default true)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleMaencofRead(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── maencof_update ──────────────────────────────────────────────
  server.registerTool(
    'maencof_update',
    {
      description:
        'Updates an existing document. The updated field in Frontmatter is automatically refreshed.',
      inputSchema: z.object({
        path: z.string().describe('Document path'),
        content: z
          .string()
          .optional()
          .describe('New content (markdown, preserves existing if omitted)'),
        frontmatter: z
          .object({
            tags: z.array(z.string()).optional(),
            title: z.string().optional(),
            layer: z
              .number()
              .int()
              .min(1)
              .max(5)
              .optional()
              .describe('Layer change (1-5, use when correcting Layer violations)'),
            confidence: z.number().min(0).max(1).optional(),
            schedule: z.string().optional(),
          })
          .optional()
          .describe('Partial Frontmatter update (optional)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleMaencofUpdate(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── maencof_delete ──────────────────────────────────────────────
  server.registerTool(
    'maencof_delete',
    {
      description:
        'Deletes a document. Layer 1 documents cannot be deleted. Requires force=true if backlinks exist.',
      inputSchema: z.object({
        path: z.string().describe('Document path'),
        force: z
          .boolean()
          .optional()
          .describe('Ignore backlink warnings (default false)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleMaencofDelete(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── maencof_move ────────────────────────────────────────────────
  server.registerTool(
    'maencof_move',
    {
      description:
        'Moves a document to a different Layer (transition). Layer 1 documents cannot be moved.',
      inputSchema: z.object({
        path: z.string().describe('Document path'),
        target_layer: z
          .number()
          .int()
          .min(1)
          .max(5)
          .describe('Target Layer (1-5)'),
        reason: z.string().optional().describe('Reason for transition'),
        confidence: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('Confidence score (for Layer 3→2 transition)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleMaencofMove(vaultPath, {
          ...args,
          target_layer: args.target_layer as 1 | 2 | 3 | 4 | 5,
        });
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

/**
 * Registers 5 KG tools: kg_search, kg_navigate, kg_context, kg_status, kg_build
 */
function registerKgTools(server: McpServer): void {
  // ─── kg_search ───────────────────────────────────────────────────
  server.registerTool(
    'kg_search',
    {
      description:
        'Explores related documents via Spreading Activation (SA) from seed nodes (paths or keywords).',
      inputSchema: z.object({
        seed: z
          .array(z.string())
          .min(1)
          .describe('Seed nodes (paths or keywords)'),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Maximum results to return (default 10)'),
        decay: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('Decay factor (default 0.7)'),
        threshold: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('Activation threshold (default 0.1)'),
        max_hops: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('Maximum hop count (default 5)'),
        layer_filter: z
          .array(z.number().int().min(1).max(5))
          .optional()
          .describe('Layer filter (1-5)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = await handleKgSearch(graph, {
          ...args,
          layer_filter: args.layer_filter as (1 | 2 | 3 | 4 | 5)[] | undefined,
        });
        if ('error' in result) {
          return { content: [{ type: 'text' as const, text: result.error }] };
        }
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_navigate ─────────────────────────────────────────────────
  server.registerTool(
    'kg_navigate',
    {
      description:
        'Retrieves neighbors (inbound/outbound links, parent/child, siblings) of a specific node.',
      inputSchema: z.object({
        path: z.string().describe('Target node path'),
        include_inbound: z
          .boolean()
          .optional()
          .describe('Include inbound links (default true)'),
        include_outbound: z
          .boolean()
          .optional()
          .describe('Include outbound links (default true)'),
        include_hierarchy: z
          .boolean()
          .optional()
          .describe('Include parent/child/siblings (default true)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = await handleKgNavigate(graph, args);
        if ('error' in result) {
          return { content: [{ type: 'text' as const, text: result.error }] };
        }
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_context ──────────────────────────────────────────────────
  server.registerTool(
    'kg_context',
    {
      description:
        'Returns a context block assembled from documents relevant to the query within a token budget.',
      inputSchema: z.object({
        query: z.string().describe('Search query'),
        token_budget: z
          .number()
          .int()
          .min(100)
          .max(10000)
          .optional()
          .describe('Token budget (default 2000)'),
        include_full: z
          .boolean()
          .optional()
          .describe('Include full text of top N results (default false)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = await handleKgContext(graph, args);
        if ('error' in result) {
          return { content: [{ type: 'text' as const, text: result.error }] };
        }
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_status ───────────────────────────────────────────────────
  server.registerTool(
    'kg_status',
    {
      description:
        'Retrieves index status (node count, edge count, stale ratio, freshness).',
      inputSchema: z.object({}),
    },
    async (_args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = await handleKgStatus(vaultPath, graph, {});
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_build ────────────────────────────────────────────────────
  server.registerTool(
    'kg_build',
    {
      description:
        'Builds the knowledge graph index. force=true triggers a full rebuild; default is incremental.',
      inputSchema: z.object({
        force: z.boolean().optional().describe('Full rebuild (default false)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleKgBuild(vaultPath, args);
        if (result.success) invalidateCache();
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── kg_suggest_links ─────────────────────────────────────────────
  server.registerTool(
    'kg_suggest_links',
    {
      description:
        'Suggests link candidates from the existing knowledge base for a target document. Two-stage algorithm: tag Jaccard similarity + SA reinforcement.',
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe('Target document path (existing document)'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tag list for a new document'),
        content_hint: z
          .string()
          .optional()
          .describe('Partial content of a new document (for keyword extraction)'),
        max_suggestions: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe('Maximum suggestions (default 5)'),
        min_score: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe('Minimum similarity threshold (default 0.2)'),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await loadGraphIfNeeded(vaultPath);
        const result = handleKgSuggestLinks(graph, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

/**
 * Registers 3 CLAUDE.md tools: claudemd_merge, claudemd_read, claudemd_remove
 */
function registerClaudeMdTools(server: McpServer): void {
  // ─── claudemd_merge ───────────────────────────────────────────────
  server.registerTool(
    'claudemd_merge',
    {
      description:
        'Inserts or updates the maencof directive section in CLAUDE.md at CWD. Section managed via markers (MAENCOF:START/END).',
      inputSchema: z.object({
        content: z
          .string()
          .describe('maencof directive to insert into CLAUDE.md (markdown)'),
        dry_run: z
          .boolean()
          .optional()
          .describe('Dry run mode (default false)'),
      }),
    },
    (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdMerge(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── claudemd_read ────────────────────────────────────────────────
  server.registerTool(
    'claudemd_read',
    {
      description:
        'Reads the maencof directive section from CLAUDE.md at CWD.',
      inputSchema: z.object({}),
    },
    (_args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdRead(vaultPath);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  // ─── claudemd_remove ──────────────────────────────────────────────
  server.registerTool(
    'claudemd_remove',
    {
      description:
        'Removes the maencof directive section from CLAUDE.md at CWD.',
      inputSchema: z.object({
        dry_run: z
          .boolean()
          .optional()
          .describe('Dry run mode (default false)'),
      }),
    },
    (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleClaudeMdRemove(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

/**
 * Registers 1 Dailynote tool: dailynote_read
 */
function registerDailynoteTools(server: McpServer): void {
  server.registerTool(
    'dailynote_read',
    {
      description:
        'Queries the dailynote (daily activity log). Supports date, category filter, and last N days lookup.',
      inputSchema: z.object({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe('Date to query YYYY-MM-DD (default: today)'),
        category: z
          .enum([
            'document',
            'search',
            'index',
            'config',
            'session',
            'diagnostic',
          ])
          .optional()
          .describe('Category filter'),
        last_days: z
          .number()
          .int()
          .min(1)
          .max(30)
          .optional()
          .describe('Query last N days (default 1, max 30)'),
      }),
    },
    (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = handleDailynoteRead(vaultPath, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}

/**
 * Starts the MCP server with stdio transport.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
