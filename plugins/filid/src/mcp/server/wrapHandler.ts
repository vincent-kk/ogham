import { toolError } from './toolError.js';
import { toolResult } from './toolResult.js';

/** Subset of the MCP request extra forwarded to handlers (abort propagation). */
export interface HandlerExtra {
  signal?: AbortSignal;
}

/**
 * Wrap a tool handler with standard try/catch error handling.
 * Reduces repetitive boilerplate across all 19 registerTool callbacks.
 * The MCP request extra is forwarded so long-polling handlers can observe
 * the call's AbortSignal; single-param handlers simply ignore it.
 */
export function wrapHandler<T>(
  fn: (args: T, extra?: HandlerExtra) => unknown | Promise<unknown>,
  options?: { checkErrorField?: boolean },
): (
  args: T,
  extra?: HandlerExtra,
) => Promise<
  | ReturnType<typeof toolResult>
  | ReturnType<typeof toolError>
  | { content: Array<{ type: 'text'; text: string }> }
> {
  return async (args: T, extra?: HandlerExtra) => {
    try {
      const result = await fn(args, extra);
      if (
        options?.checkErrorField &&
        result &&
        typeof result === 'object' &&
        'error' in result
      )
        return {
          content: [
            {
              type: 'text' as const,
              text: String((result as { error: unknown }).error),
            },
          ],
        };

      return toolResult(result);
    } catch (error) {
      return toolError(error);
    }
  };
}
