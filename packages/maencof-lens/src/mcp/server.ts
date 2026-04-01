import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { loadConfig } from '../config/config-loader.js';
import { handleLensContext } from '../tools/lens-context.js';
import { handleLensNavigate } from '../tools/lens-navigate.js';
import { handleLensRead } from '../tools/lens-read.js';
import { handleLensSearch } from '../tools/lens-search.js';
import { handleLensStatus } from '../tools/lens-status.js';
import { GraphCache } from '../vault/graph-cache.js';
import { VaultRouter } from '../vault/vault-router.js';
import { VERSION } from '../version.js';

import { toolError, toolResult } from './shared.js';

export function createLensServer(configRoot: string) {
  const config = loadConfig(configRoot);
  const server = new McpServer({ name: 'maencof-lens', version: VERSION });

  let router: VaultRouter | null = null;
  const graphCache = new GraphCache();

  if (config) {
    router = new VaultRouter(config);
  }

  const resolveVault = (vaultName?: string) => {
    if (!router) throw new Error('No .maencof-lens/config.json found. Run /maencof-lens:setup-lens to configure.');
    return router.resolve(vaultName);
  };

  // --- lens_search ---
  server.tool(
    'lens_search',
    'Search vault knowledge via Spreading Activation from seed keywords.',
    {
      vault: z.optional(z.string()),
      seed: z.array(z.string()).min(1),
      max_results: z.optional(z.number()),
      decay: z.optional(z.number()),
      threshold: z.optional(z.number()),
      max_hops: z.optional(z.number()),
      layer_filter: z.optional(z.array(z.number())),
      sub_layer: z.optional(z.string()),
    },
    async (args) => {
      try {
        const vault = resolveVault(args.vault);
        const graph = await graphCache.getGraph(vault.path);
        const result = await handleLensSearch(graph, args, vault.layers);
        return toolResult(result);
      } catch (e) {
        return toolError(String(e instanceof Error ? e.message : e));
      }
    },
  );

  // --- lens_context ---
  server.tool(
    'lens_context',
    'Assemble a token-budgeted context block from vault documents matching a query.',
    {
      vault: z.optional(z.string()),
      query: z.string(),
      token_budget: z.optional(z.number()),
      include_full: z.optional(z.boolean()),
      layer_filter: z.optional(z.array(z.number())),
    },
    async (args) => {
      try {
        const vault = resolveVault(args.vault);
        const graph = await graphCache.getGraph(vault.path);
        const result = await handleLensContext(graph, args, vault.path, vault.layers);
        return toolResult(result);
      } catch (e) {
        return toolError(String(e instanceof Error ? e.message : e));
      }
    },
  );

  // --- lens_navigate ---
  server.tool(
    'lens_navigate',
    'Explore graph neighbors (inbound/outbound links, parent/child) of a specific node.',
    {
      vault: z.optional(z.string()),
      path: z.string(),
      include_inbound: z.optional(z.boolean()),
      include_outbound: z.optional(z.boolean()),
      include_hierarchy: z.optional(z.boolean()),
    },
    async (args) => {
      try {
        const vault = resolveVault(args.vault);
        const graph = await graphCache.getGraph(vault.path);
        const result = await handleLensNavigate(graph, args, vault.layers);
        return toolResult(result);
      } catch (e) {
        return toolError(String(e instanceof Error ? e.message : e));
      }
    },
  );

  // --- lens_read ---
  server.tool(
    'lens_read',
    'Read a single vault document by path.',
    {
      vault: z.optional(z.string()),
      path: z.string(),
    },
    async (args) => {
      try {
        const vault = resolveVault(args.vault);
        const result = await handleLensRead(args, vault.path, vault.layers);
        if ('error' in result) return toolError(result.error as string);
        return toolResult(result);
      } catch (e) {
        return toolError(String(e instanceof Error ? e.message : e));
      }
    },
  );

  // --- lens_status ---
  server.tool(
    'lens_status',
    'Check vault index status including node count, staleness, and health.',
    {
      vault: z.optional(z.string()),
    },
    async (args) => {
      try {
        const vault = resolveVault(args.vault);
        const graph = await graphCache.getGraph(vault.path);
        const result = await handleLensStatus(vault.path, graph);
        return toolResult(result);
      } catch (e) {
        return toolError(String(e instanceof Error ? e.message : e));
      }
    },
  );

  return server;
}
