/**
 * @file server.ts
 * @description atlassian MCP server — tool registration + routing
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { VERSION } from "../../version.js";
import { ConvertFormatSchema } from "../../types/index.js";
import type { FetchContext, HttpClientConfig } from "../../types/index.js";
import { loadConfig } from "../../core/config-manager/index.js";
import { getAuthHeader } from "../../core/auth-manager/index.js";
import { detectService, resolveSiteConfig } from "../../utils/index.js";
import { wrapHandler } from "../shared/index.js";
import { handleFetch } from "../tools/fetch/index.js";
import { handleConvert } from "../tools/convert/index.js";
import { handleSetup } from "../tools/setup/index.js";
import { handleAuthCheck } from "../tools/auth-check/index.js";

/** Build FetchContext (HttpClientConfig + service + apiVersion) for a fetch call. */
async function buildFetchContext(
  service: "jira" | "confluence",
  baseUrl?: string,
  endpoint?: string,
): Promise<FetchContext | null> {
  const config = await loadConfig();
  const sites = config[service];
  if (!sites || sites.length === 0) return null;

  const siteConfig = resolveSiteConfig(service, sites, baseUrl, endpoint);

  const authHeader = await getAuthHeader(service, siteConfig.username);

  const http: HttpClientConfig = {
    base_url: siteConfig.base_url,
    auth_header: authHeader ?? undefined,
    ssl_verify: siteConfig.ssl_verify,
    timeout: siteConfig.timeout,
  };

  const apiVersion: '2' | '3' = service === 'jira'
    ? (siteConfig.api_version_override ?? (siteConfig.is_cloud ? '3' : '2'))
    : (siteConfig.is_cloud ? '3' : '2');

  return { http, service, apiVersion };
}

/**
 * Create and configure the MCP server with all tool registrations.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "atlassian",
    version: VERSION,
  });

  // --- fetch ---
  server.registerTool(
    "fetch",
    {
      description:
        "[Internal] Do not call directly. Used by atlassian skills only. HTTP request for Atlassian REST APIs.",
      inputSchema: z.object({
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        endpoint: z.string(),
        base_url: z.string().url().optional(),
        body: z.unknown().optional(),
        query_params: z.record(z.string()).optional(),
        expand: z.array(z.string()).optional(),
        headers: z.record(z.string()).optional(),
        accept_format: z.enum(["json", "raw"]).optional(),
        content_type: z.string().optional(),
        content_format: z.enum(["json", "markdown"]).optional(),
        save_to_path: z.string().optional(),
        force: z.boolean().optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(
      async (args: {
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        endpoint: string;
        base_url?: string;
        body?: unknown;
        query_params?: Record<string, string>;
        expand?: string[];
        headers?: Record<string, string>;
        accept_format?: "json" | "raw";
        content_type?: string;
        content_format?: "json" | "markdown";
        save_to_path?: string;
        force?: boolean;
      }) => {
        const service = detectService(args.endpoint);
        const ctx = await buildFetchContext(service, args.base_url, args.endpoint);
        if (!ctx)
          throw new Error(
            `No ${service} configuration found. Run setup first.`,
          );
        return handleFetch(args, ctx);
      },
    ),
  );

  // --- convert ---
  server.registerTool(
    "convert",
    {
      description: "[Internal] Do not call directly. Used by atlassian skills only. Format conversion: ADF/Storage/Wiki ↔ Markdown.",
      inputSchema: z.object({
        from: ConvertFormatSchema,
        to: ConvertFormatSchema,
        content: z.string(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleConvert),
  );

  // --- auth-check ---
  server.registerTool(
    "auth-check",
    {
      description:
        "[Internal] Do not call directly. Used by atlassian skills only. Check authentication status and test connectivity.",
      inputSchema: z.object({
        connection_test: z.boolean().optional(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleAuthCheck),
  );

  // --- setup ---
  server.registerTool(
    "setup",
    {
      description: "[Internal] Do not call directly. Used by atlassian skills only. Auth/connection setup wizard.",
      inputSchema: z.object({
        mode: z.enum(["new", "edit"]).optional(),
        prefill: z.record(z.unknown()).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleSetup),
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
