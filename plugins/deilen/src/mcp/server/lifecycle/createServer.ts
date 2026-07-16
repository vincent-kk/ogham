import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { McpToolName } from "../../../constants/mcpToolNames.js";
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
    McpToolName.RENDER_VIEWER,
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
            "Markdown body to render. Mutually exclusive with path. Pass content " +
              "when the body lives in the conversation; pass path when it is " +
              "already a file on disk, so only the path enters tool input.",
          ),
        path: z
          .string()
          .optional()
          .describe(
            "Path to a local markdown file — absolute, or relative to the " +
              "workspace root. Read when content is omitted. Mutually exclusive " +
              "with content.",
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
        project_root: z
          .string()
          .optional()
          .describe(
            "Absolute path of the workspace directory. Omit on Claude Code, " +
              "where this server already runs from the workspace; required on " +
              "hosts that launch it from the plugin install directory.",
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
    McpToolName.COLLECT_FEEDBACK,
    {
      description:
        "Collect line-anchored feedback for a render session via a bounded " +
        "long-poll. Blocks until the user clicks Submit, then returns their " +
        "comments (and any attached images). One call covers the whole review — " +
        'only if the wait elapses first does it return { status: "pending" }; ' +
        "on pending do NOT call again — ask the user to say the word once they " +
        "have submitted, then wait for their message (their submission is held).",
      inputSchema: {
        session_id: z
          .string()
          .describe("The session_id returned by render_viewer."),
        wait_seconds: z
          .number()
          .int()
          .min(1)
          .max(600)
          .optional()
          .describe(
            "Max seconds to wait this call (default from config, capped at " +
              "600). Leave unset unless the user wants a shorter wait — the " +
              "default is sized to cover a full review in one call.",
          ),
        project_root: z
          .string()
          .optional()
          .describe(
            "Absolute path of the workspace directory. Omit on Claude Code, " +
              "where this server already runs from the workspace; required on " +
              "hosts that launch it from the plugin install directory.",
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
    McpToolName.CLOSE_VIEWER,
    {
      description:
        "Close a render session: mark it closed and settle any pending " +
        "collect_feedback. Optional — submitting feedback also closes the " +
        "session; the shared local server idles out shortly after.",
      inputSchema: {
        session_id: z
          .string()
          .describe("The session_id returned by render_viewer."),
        project_root: z
          .string()
          .optional()
          .describe(
            "Absolute path of the workspace directory. Omit on Claude Code, " +
              "where this server already runs from the workspace; required on " +
              "hosts that launch it from the plugin install directory.",
          ),
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
    McpToolName.OPEN_SETTINGS,
    {
      description:
        "Open the deilen settings UI in a local browser to configure theme, " +
        "auto-open, timeouts, renderer toggles, and size limits. Returns a " +
        "localhost URL.",
      inputSchema: {
        project_root: z
          .string()
          .optional()
          .describe(
            "Absolute path of the workspace directory. Omit on Claude Code, " +
              "where this server already runs from the workspace; required on " +
              "hosts that launch it from the plugin install directory.",
          ),
      },
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
