import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/** Wrap a handler's return value as a compact JSON tool result. */
export function toolResult(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

/** Wrap a thrown error as a tool result the model can act on. */
export function toolError(error: unknown): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: error instanceof Error ? error.message : String(error),
      },
    ],
  };
}
