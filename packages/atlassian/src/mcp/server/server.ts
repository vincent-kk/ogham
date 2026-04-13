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
import { handleGet } from "../tools/get/index.js";
import { handlePost } from "../tools/post/index.js";
import { handlePut } from "../tools/put/index.js";
import { handleDelete } from "../tools/delete/index.js";
import { handleConvert } from "../tools/convert/index.js";
import { handleSetup } from "../tools/setup/index.js";

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

  // --- get ---
  server.registerTool(
    "get",
    {
      description: "HTTP GET — resource retrieval, search",
      inputSchema: z.object({
        endpoint: z.string(),
        query_params: z.record(z.string()).optional(),
        expand: z.array(z.string()).optional(),
        headers: z.record(z.string()).optional(),
        accept_format: z.enum(["json", "raw"]).optional(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(
      async (args: {
        endpoint: string;
        query_params?: Record<string, string>;
        expand?: string[];
        headers?: Record<string, string>;
        accept_format?: "json" | "raw";
      }) => {
        const service = detectService(args.endpoint);
        const config = await buildClientConfig(service);
        if (!config)
          throw new Error(
            `No ${service} configuration found. Run setup first.`,
          );
        return handleGet(args, config);
      },
    ),
  );

  // --- post ---
  server.registerTool(
    "post",
    {
      description: "HTTP POST — resource creation, search (JQL)",
      inputSchema: z.object({
        endpoint: z.string(),
        body: z.unknown(),
        headers: z.record(z.string()).optional(),
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
        endpoint: string;
        body?: unknown;
        headers?: Record<string, string>;
        content_type?: string;
        content_format?: "json" | "markdown";
      }) => {
        const service = detectService(args.endpoint);
        const config = await buildClientConfig(service);
        if (!config)
          throw new Error(
            `No ${service} configuration found. Run setup first.`,
          );
        return handlePost({ ...args, body: args.body }, config);
      },
    ),
  );

  // --- put ---
  server.registerTool(
    "put",
    {
      description: "HTTP PUT/PATCH — resource modification",
      inputSchema: z.object({
        endpoint: z.string(),
        body: z.unknown(),
        method: z.enum(["PUT", "PATCH"]).optional(),
        headers: z.record(z.string()).optional(),
        content_format: z.enum(["json", "markdown"]).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(
      async (args: {
        endpoint: string;
        body?: unknown;
        method?: "PUT" | "PATCH";
        headers?: Record<string, string>;
        content_format?: "json" | "markdown";
      }) => {
        const service = detectService(args.endpoint);
        const config = await buildClientConfig(service);
        if (!config)
          throw new Error(
            `No ${service} configuration found. Run setup first.`,
          );
        return handlePut({ ...args, body: args.body }, config);
      },
    ),
  );

  // --- delete ---
  server.registerTool(
    "delete",
    {
      description: "HTTP DELETE — resource deletion",
      inputSchema: z.object({
        endpoint: z.string(),
        query_params: z.record(z.string()).optional(),
        headers: z.record(z.string()).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    wrapHandler(
      async (args: {
        endpoint: string;
        query_params?: Record<string, string>;
        headers?: Record<string, string>;
      }) => {
        const service = detectService(args.endpoint);
        const config = await buildClientConfig(service);
        if (!config)
          throw new Error(
            `No ${service} configuration found. Run setup first.`,
          );
        return handleDelete(args, config);
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
