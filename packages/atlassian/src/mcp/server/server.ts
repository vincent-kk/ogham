/**
 * @file server.ts
 * @description atlassian MCP server — tool registration + routing
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { VERSION } from "../../version.js";
import { ConvertFormatSchema } from "../../types/index.js";
import { loadConfig } from "../../core/config-manager/index.js";
import { getAuthHeader } from "../../core/auth-manager/index.js";
import type { HttpClientConfig } from "../../core/http-client/index.js";
import { wrapHandler } from "../shared/shared.js";
import { handleFetch } from "../tools/fetch/index.js";
import { handleConvert } from "../tools/convert/index.js";
import { handleSetup } from "../tools/setup/index.js";
import { handleAuthCheck } from "../tools/auth-check/index.js";

/** Build HttpClientConfig from stored config for a service */
async function buildClientConfig(
  service: "jira" | "confluence",
): Promise<HttpClientConfig | null> {
  const config = await loadConfig();
  const serviceConfig = config[service];
  if (!serviceConfig) return null;

  const authHeader = await getAuthHeader(
    service,
    serviceConfig.auth_type,
    serviceConfig.username,
  );

  return {
    base_url: serviceConfig.base_url,
    auth_header: authHeader ?? undefined,
    ssl_verify: serviceConfig.ssl_verify,
    timeout: serviceConfig.timeout,
  };
}

/** Detect service from endpoint path */
function detectService(endpoint: string): "jira" | "confluence" {
  if (endpoint.includes("/wiki/") || endpoint.startsWith("/api/v2/")) {
    return "confluence";
  }
  return "jira";
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
        "HTTP request — supports GET, POST, PUT, PATCH, DELETE for Atlassian REST APIs",
      inputSchema: z.object({
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        endpoint: z.string(),
        body: z.unknown().optional(),
        query_params: z.record(z.string()).optional(),
        expand: z.array(z.string()).optional(),
        headers: z.record(z.string()).optional(),
        accept_format: z.enum(["json", "raw"]).optional(),
        content_type: z.string().optional(),
        content_format: z.enum(["json", "markdown"]).optional(),
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
        body?: unknown;
        query_params?: Record<string, string>;
        expand?: string[];
        headers?: Record<string, string>;
        accept_format?: "json" | "raw";
        content_type?: string;
        content_format?: "json" | "markdown";
      }) => {
        const service = detectService(args.endpoint);
        const config = await buildClientConfig(service);
        if (!config)
          throw new Error(
            `No ${service} configuration found. Run setup first.`,
          );
        return handleFetch(args, config);
      },
    ),
  );

  // --- convert ---
  server.registerTool(
    "convert",
    {
      description: "Format conversion: ADF/Storage/Wiki ↔ Markdown",
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
        "Check authentication status and optionally test connectivity",
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
      description: "Auth/connection setup wizard",
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
