/**
 * @file kg.ts
 * @description Registers 7 KG tools via the wrapper organ:
 * 1 mutate (boundary_create) + 4 fresh reads (kg_search/navigate/context/suggest_links)
 * + 2 plain reads (kg_status, kg_build).
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { McpToolName } from '../../../constants/mcpToolNames.js';
import { handleBoundaryCreate } from '../../tools/boundaryCreate/index.js';
import { handleKgBuild } from '../../tools/kgBuild/index.js';
import { handleKgContext } from '../../tools/kgContext/index.js';
import { handleKgNavigate } from '../../tools/kgNavigate/index.js';
import { handleKgSearch } from '../../tools/kgSearch/index.js';
import { handleKgStatus } from '../../tools/kgStatus/index.js';
import { handleKgSuggestLinks } from '../../tools/kgSuggestLinks/index.js';
import { loadGraphIfNeeded } from '../graphCache/index.js';
import { registerMutateTool, registerReadTool } from '../middlewares/index.js';

export function registerKgTools(server: McpServer): void {
  // ─── kg_search (fresh read) ──────────────────────────────────────
  registerReadTool(
    server,
    McpToolName.KG_SEARCH,
    {
      description:
        'Explores related documents via Spreading Activation (SA) from seed nodes (paths or keywords).',
      inputSchema: z.object({
        seed: z
          .array(z.string())
          .min(1)
          .describe(
            'Seed nodes (paths or keywords); array items are unioned. For cross-language recall, pass each concept as two separate items — the working-language term and its English equivalent — not combined in one item (multi-word within a single item is AND-matched).',
          ),
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
        sub_layer: z
          .enum(['relational', 'structural', 'topical', 'buffer', 'boundary'])
          .optional()
          .describe(
            'Sub-layer filter (L3: relational/structural/topical, L5: buffer/boundary)',
          ),
      }),
    },
    async (_vaultPath, args, graph) =>
      handleKgSearch(graph, {
        ...args,
        layer_filter: args.layer_filter as (1 | 2 | 3 | 4 | 5)[] | undefined,
      }),
    { needsFreshness: true },
  );

  // ─── kg_navigate (fresh read) ────────────────────────────────────
  registerReadTool(
    server,
    McpToolName.KG_NAVIGATE,
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
    async (_vaultPath, args, graph) => handleKgNavigate(graph, args),
    { needsFreshness: true },
  );

  // ─── kg_context (fresh read) ─────────────────────────────────────
  registerReadTool(
    server,
    McpToolName.KG_CONTEXT,
    {
      description:
        'Returns a context block assembled from documents relevant to the query within a token budget.',
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            'Search query (split into keywords internally). Include each concept in both the working language and English for cross-language recall.',
          ),
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
    async (vaultPath, args, graph) => handleKgContext(graph, args, vaultPath),
    { needsFreshness: true },
  );

  // ─── kg_status (plain read; uses cached graph without freshness gate) ─
  registerReadTool(
    server,
    McpToolName.KG_STATUS,
    {
      description:
        'Retrieves index status (node count, edge count, stale ratio, freshness). Diagnostic only — not recommended for autonomous LLM use.',
      inputSchema: z.object({}),
    },
    async (vaultPath, args) => {
      const graph = await loadGraphIfNeeded(vaultPath);
      return handleKgStatus(vaultPath, graph, args);
    },
    { needsFreshness: false },
  );

  // ─── kg_build (plain read — invokes the rebuild itself) ───────────
  registerReadTool(
    server,
    McpToolName.KG_BUILD,
    {
      description:
        'Builds the knowledge graph index. Default is incremental; the MCP server also auto-triggers a background rebuild after stale-node accumulation, so explicit invocation is rarely needed. force=true triggers an explicit full rebuild.',
      inputSchema: z.object({
        force: z.boolean().optional().describe('Full rebuild (default false)'),
      }),
    },
    async (vaultPath, args) => handleKgBuild(vaultPath, args),
    { needsFreshness: false },
  );

  // ─── boundary_create (mutate) ────────────────────────────────────
  registerMutateTool(
    server,
    McpToolName.BOUNDARY_CREATE,
    {
      description:
        'Creates a boundary document in 05_Context/boundary/. Boundary documents bridge multiple layers and enable CROSS_LAYER edges.',
      inputSchema: z.object({
        title: z.string().describe('Boundary document title'),
        boundary_type: z
          .enum(['project_moc', 'cross_domain', 'synthesis'])
          .describe('Boundary object type'),
        connected_layers: z
          .array(z.number().int().min(1).max(5))
          .min(1)
          .describe('Connected layer numbers'),
        tags: z.array(z.string()).min(1).describe('Tag list (at least 1)'),
      }),
    },
    async (vaultPath, args) => handleBoundaryCreate(vaultPath, args),
    (_args, result) => result.path ?? null,
  );

  // ─── kg_suggest_links (fresh read) ───────────────────────────────
  registerReadTool(
    server,
    McpToolName.KG_SUGGEST_LINKS,
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
          .describe(
            'Partial content of a new document (for keyword extraction)',
          ),
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
    async (_vaultPath, args, graph) =>
      Promise.resolve(handleKgSuggestLinks(graph, args)),
    { needsFreshness: true },
  );
}
