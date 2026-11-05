/**
 * @file server.ts
 * @description atlassian MCP server — tool registration + routing
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { McpToolName } from "../../constants/mcpToolNames.js";
import { VERSION } from "../../version.js";
import {
  FetchInputSchema,
  ConvertDirectionSchema,
  AuthCheckInputSchema,
  SetupInputSchema,
  CommentThreadInputSchema,
} from "../../types/index.js";
import { detectService } from "../../utils/index.js";
import { wrapHandler, buildFetchContext } from "../shared/index.js";
import { handleFetch } from "../tools/fetch/index.js";
import { handleConvert } from "../tools/convert/index.js";
import { handleSetup } from "../tools/setup/index.js";
import { handleAuthCheck } from "../tools/authCheck/index.js";
import {
  handleCommentThread,
  type CommentThreadArgs,
} from "../tools/commentThread/index.js";

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
    McpToolName.FETCH,
    {
      description:
        "[Internal] Do not call directly. Used by atlassian skills only. HTTP request for Atlassian REST APIs.",
      inputSchema: FetchInputSchema,
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
        service?: "jira" | "confluence";
        base_url?: string;
        body?: unknown;
        query_params?: Record<string, string>;
        expand?: string[];
        headers?: Record<string, string>;
        accept_format?: "json" | "raw";
        content_type?: string;
        content_format?: "json" | "markdown";
        save_to_path?: string;
        project_root?: string;
      }) => {
        const service = args.service ?? detectService(args.endpoint);
        const ctx = await buildFetchContext(
          service,
          args.base_url,
          args.endpoint,
        );
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
    McpToolName.CONVERT,
    {
      description:
        "[Internal] Do not call directly. Used by atlassian skills only. Format conversion: ADF/Storage/Wiki ↔ Markdown.",
      inputSchema: ConvertDirectionSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleConvert),
  );

  // --- auth_check ---
  server.registerTool(
    McpToolName.AUTH_CHECK,
    {
      description:
        "[Internal] Do not call directly. Used by atlassian skills only. Check authentication status and test connectivity.",
      inputSchema: AuthCheckInputSchema,
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
    McpToolName.SETUP,
    {
      description:
        "[Internal] Do not call directly. Used by atlassian skills only. Auth/connection setup wizard.",
      inputSchema: SetupInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleSetup),
  );

  // --- comment_thread ---
  server.registerTool(
    McpToolName.COMMENT_THREAD,
    {
      description:
        "[Internal] Do not call directly. Used by the atlassian jira skill only. Jira Server/DC comment thread with third-party reply-plugin replies merged from the changelog (modes: read, scan, probe, save_profile).",
      inputSchema: CommentThreadInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    wrapHandler(async (args: CommentThreadArgs) => {
      const context = await buildFetchContext("jira", args.base_url);
      if (!context)
        throw new Error("No jira configuration found. Run setup first.");
      return handleCommentThread(args, context);
    }),
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
