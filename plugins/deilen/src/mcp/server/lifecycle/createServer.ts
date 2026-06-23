import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { RenderOptionsSchema } from "../../../types/renderOptions.js";
import { VERSION } from "../../../version.js";
import { wrapHandler } from "../../shared/index.js";
import { handleCollectFeedback } from "../../tools/collectFeedback/index.js";
import { handleCloseViewer } from "../../tools/closeViewer/index.js";
import { handleOpenSettings } from "../../tools/openSettings/index.js";
import { handleRenderViewer } from "../../tools/renderViewer/index.js";

/** Create the MCP "tools" server and register deilen's tools. */
export function createServer(): McpServer {
  const server = new McpServer({ name: "tools", version: VERSION });

  server.registerTool(
    "render_viewer",
    {
      description:
        "Render a Claude-generated markdown document as a readable local browser " +
        "page and return its URL immediately (non-blocking). Pair with " +
        "collect_feedback to gather line-anchored comments. Provide exactly one " +
        "of content or path.",
      inputSchema: {
        content: z
          .string()
          .optional()
          .describe(
            "Markdown body to render. Mutually exclusive with path. Prefer path " +
              "for large documents to avoid duplicating the body into tool input.",
          ),
        path: z
          .string()
          .optional()
          .describe(
            "Absolute or cwd-relative path to a local markdown file. Read when " +
              "content is omitted. Mutually exclusive with content.",
          ),
        title: z
          .string()
          .optional()
          .describe(
            "Page title. Defaults to the first H1, then the file name.",
          ),
        options: RenderOptionsSchema.optional().describe(
          "Per-call overrides for theme, content width, and renderer toggles " +
            "(falls back to saved config).",
        ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleRenderViewer),
  );

  server.registerTool(
    "collect_feedback",
    {
      description:
        "Collect line-anchored feedback for a render session via a bounded " +
        "long-poll. Returns the submitted comments (and any attached images) " +
        'once the user clicks Submit, or { status: "pending" } on timeout — ' +
        "re-call until complete.",
      inputSchema: {
        session_id: z
          .string()
          .describe("The session_id returned by render_viewer."),
        wait_seconds: z
          .number()
          .int()
          .min(1)
          .max(55)
          .optional()
          .describe(
            "Max seconds to wait this call (default from config, capped at 55, " +
              "below the client MCP timeout). On timeout, re-call.",
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleCollectFeedback),
  );

  server.registerTool(
    "close_viewer",
    {
      description:
        "End a render session: mark it closed, settle any pending " +
        "collect_feedback, and reap the local server if it was the last open " +
        "session. Optional — submitting feedback also closes the session.",
      inputSchema: {
        session_id: z
          .string()
          .describe("The session_id returned by render_viewer."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    wrapHandler(handleCloseViewer),
  );

  server.registerTool(
    "open_settings",
    {
      description:
        "Open the deilen settings UI in a local browser to configure theme, " +
        "auto-open, timeouts, renderer toggles, and size limits. No arguments; " +
        "returns a localhost URL.",
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleOpenSettings),
  );

  return server;
}
