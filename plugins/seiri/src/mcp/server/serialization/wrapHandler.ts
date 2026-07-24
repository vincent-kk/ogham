import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { toolError, toolResult } from './toolResult.js';

/**
 * Adapt a plain handler to the MCP calling convention: serialise its
 * return value, and turn a throw into an error result rather than letting
 * it take down the server. The model sees the message and can correct.
 */
export function wrapHandler<Input, Output>(
  handler: (input: Input, extra?: { signal?: AbortSignal }) => Output,
): (args: Input, extra?: { signal?: AbortSignal }) => Promise<CallToolResult> {
  return async (args, extra) => {
    try {
      return toolResult(await handler(args, extra));
    } catch (error) {
      return toolError(error);
    }
  };
}
