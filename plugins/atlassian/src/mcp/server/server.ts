/**
 * @file server.ts
 * @description atlassian MCP server — tool registration + routing
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PROJECT_ROOT_ARG_DESCRIPTION } from "@ogham/cross-platform";
import { z } from "zod";

import { McpToolName } from "../../constants/mcpToolNames.js";
import { VERSION } from "../../version.js";
import {
  ConvertFormatSchema,
  JiraCommentThreadInputSchema,
} from "../../types/index.js";
import { detectService } from "../../utils/index.js";
import { wrapHandler, buildFetchContext } from "../shared/index.js";
import { handleFetch } from "../tools/fetch/index.js";
import { handleConvert } from "../tools/convert/index.js";
import { handleSetup } from "../tools/setup/index.js";
import { handleAuthCheck } from "../tools/authCheck/index.js";
import {
  handleJiraCommentThread,
  type JiraCommentThreadArgs,
} from "../tools/jiraCommentThread/index.js";

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
      inputSchema: z.object({
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
        endpoint: z.string(),
        service: z.enum(["jira", "confluence"]).optional(),
        base_url: z.string().url().optional(),
        body: z.unknown().optional(),
        query_params: z.record(z.string()).optional(),
        expand: z.array(z.string()).optional(),
        headers: z.record(z.string()).optional(),
        accept_format: z.enum(["json", "raw"]).optional(),
        content_type: z.string().optional(),
        content_format: z.enum(["json", "markdown"]).optional(),
        save_to_path: z.string().optional(),
        project_root: z
          .string()
          .optional()
          .describe(PROJECT_ROOT_ARG_DESCRIPTION),
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

  // --- auth_check ---
  server.registerTool(
    McpToolName.AUTH_CHECK,
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
    McpToolName.SETUP,
    {
      description:
        "[Internal] Do not call directly. Used by atlassian skills only. Auth/connection setup wizard.",
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

  // --- jira_comment_thread ---
  server.registerTool(
    McpToolName.JIRA_COMMENT_THREAD,
    {
      description:
        "[Internal] Do not call directly. Used by the atlassian jira skill only. Jira Server/DC comment thread with third-party reply-plugin replies merged from the changelog (modes: read, scan, probe, save_profile).",
      inputSchema: JiraCommentThreadInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    wrapHandler(async (args: JiraCommentThreadArgs) => {
      const context = await buildFetchContext("jira", args.base_url);
      if (!context)
        throw new Error("No jira configuration found. Run setup first.");
      return handleJiraCommentThread(args, context);
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
