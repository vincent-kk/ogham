import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Serialize a plain data result as a single JSON text content block. */
export function toolResult(result: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
}
