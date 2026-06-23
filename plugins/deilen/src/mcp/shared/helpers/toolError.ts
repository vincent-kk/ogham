import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Build an error envelope (`isError: true`) from a thrown value. */
export function toolError(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}
