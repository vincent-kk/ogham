import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { loadConfig } from "../../config/configLoader/configLoader.js";
import { McpToolName } from "../../constants/mcpToolNames.js";
import { handleLensContext } from "../../tools/lensContext/lensContext.js";
import { handleLensNavigate } from "../../tools/lensNavigate/lensNavigate.js";
import { handleLensRead } from "../../tools/lensRead/lensRead.js";
import { handleLensSearch } from "../../tools/lensSearch/lensSearch.js";
import { handleLensStatus } from "../../tools/lensStatus/lensStatus.js";
import { GraphCache } from "../../vault/graphCache/graphCache.js";
import { VaultRouter } from "../../vault/vaultRouter/vaultRouter.js";
import { VERSION } from "../../version.js";

import { toolError, toolResult } from "../shared/shared.js";

export function createLensServer(configRoot: string) {
  const config = loadConfig(configRoot);
  const server = new McpServer({ name: "maencof-lens", version: VERSION });

  let router: VaultRouter | null = null;
  const graphCache = new GraphCache();

  if (config) {
    router = new VaultRouter(config);
  }

  const resolveVault = (vaultName?: string) => {
    if (!router)
      throw new Error(
        "No .maencof-lens/config.json found. Run /maencof-lens:setup to configure.",
      );
    return router.resolve(vaultName);
  };

  // --- search ---
  server.registerTool(
    McpToolName.SEARCH,
    {
      description:
        "Search vault knowledge via Spreading Activation from seed keywords.",
      inputSchema: z.object({
        vault: z.optional(z.string()),
        seed: z.array(z.string()).min(1),
        max_results: z.optional(z.number()),
        decay: z.optional(z.number()),
        threshold: z.optional(z.number()),
        max_hops: z.optional(z.number()),
        layer_filter: z.optional(z.array(z.number())),
        sub_layer: z.optional(z.string()),
      }),
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

  // --- context ---
  server.registerTool(
    McpToolName.CONTEXT,
    {
      description:
        "Assemble a token-budgeted context block from vault documents matching a query.",
      inputSchema: z.object({
        vault: z.optional(z.string()),
        query: z.string(),
        token_budget: z.optional(z.number()),
        include_full: z.optional(z.boolean()),
        layer_filter: z.optional(z.array(z.number())),
      }),
    },
    async (args) => {
      try {
        const vault = resolveVault(args.vault);
        const graph = await graphCache.getGraph(vault.path);
        const result = await handleLensContext(
          graph,
          args,
          vault.path,
          vault.layers,
        );
        return toolResult(result);
      } catch (e) {
        return toolError(String(e instanceof Error ? e.message : e));
      }
    },
  );

  // --- navigate ---
  server.registerTool(
    McpToolName.NAVIGATE,
    {
      description:
        "Explore graph neighbors (inbound/outbound links, parent/child) of a specific node.",
      inputSchema: z.object({
        vault: z.optional(z.string()),
        path: z.string(),
        include_inbound: z.optional(z.boolean()),
        include_outbound: z.optional(z.boolean()),
        include_hierarchy: z.optional(z.boolean()),
      }),
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

  // --- read ---
  server.registerTool(
    McpToolName.READ,
    {
      description: "Read a single vault document by path.",
      inputSchema: z.object({
        vault: z.optional(z.string()),
        path: z.string(),
      }),
    },
    async (args) => {
      try {
        const vault = resolveVault(args.vault);
        const result = await handleLensRead(args, vault.path, vault.layers);
        if ("error" in result) return toolError(result.error as string);
        return toolResult(result);
      } catch (e) {
        return toolError(String(e instanceof Error ? e.message : e));
      }
    },
  );

  // --- status ---
  server.registerTool(
    McpToolName.STATUS,
    {
      description:
        "Check vault index status including node count, staleness, and health.",
      inputSchema: z.object({
        vault: z.optional(z.string()),
      }),
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
