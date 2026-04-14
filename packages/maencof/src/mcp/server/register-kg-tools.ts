/**
 * @file register-kg-tools.ts
 * @description Registers 7 KG tools: kg_search, kg_navigate, kg_context, kg_status, kg_build, boundary_create, kg_suggest_links
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolError, toolResult } from '../shared/index.js';
import { handleBoundaryCreate } from '../tools/boundary-create/index.js';
import { handleKgBuild } from '../tools/kg-build/index.js';
import { handleKgContext } from '../tools/kg-context/index.js';
import { handleKgNavigate } from '../tools/kg-navigate/index.js';
import { handleKgSearch } from '../tools/kg-search/index.js';
import { handleKgStatus } from '../tools/kg-status/index.js';
import { handleKgSuggestLinks } from '../tools/kg-suggest-links/index.js';

import {
  ensureFreshGraph,
  getVaultPath,
  invalidateCache,
  loadGraphIfNeeded,
} from './graph-cache.js';

export function registerKgTools(server: McpServer): void {
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
        sub_layer: z
          .enum(['relational', 'structural', 'topical', 'buffer', 'boundary'])
          .optional()
          .describe(
            'Sub-layer filter (L3: relational/structural/topical, L5: buffer/boundary)',
          ),
      }),
    },
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await ensureFreshGraph(vaultPath);
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
        const graph = await ensureFreshGraph(vaultPath);
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
        const graph = await ensureFreshGraph(vaultPath);
        const result = await handleKgContext(graph, args, vaultPath);
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

  // ─── boundary_create ─────────────────────────────────────────────
  server.registerTool(
    'boundary_create',
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
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const result = await handleBoundaryCreate(vaultPath, args);
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
    async (args) => {
      try {
        const vaultPath = getVaultPath();
        const graph = await ensureFreshGraph(vaultPath);
        const result = handleKgSuggestLinks(graph, args);
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );
}
