import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";

import { toolError } from "./toolError.js";
import { toolResult } from "./toolResult.js";

/** The MCP request context passed to tool handlers (carries `signal`). */
export type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

function isCallToolResult(value: unknown): value is CallToolResult {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

/**
 * Wrap a tool handler: serialize a plain return as a JSON text block, pass a
 * pre-built content result through unchanged, and convert throws to error
 * envelopes so a handler failure never crashes the server.
 */
export function wrapHandler<T>(
  handler: (args: T, extra: ToolExtra) => unknown | Promise<unknown>,
): (args: T, extra: ToolExtra) => Promise<CallToolResult> {
  return async (args, extra) => {
    try {
      const result = await handler(args, extra);
      return isCallToolResult(result) ? result : toolResult(result);
    } catch (error) {
      return toolError(error);
    }
  };
}
