import { toolError } from './tool-error.js';
import { toolResult } from './tool-result.js';

/**
 * Wrap a tool handler with standard try/catch error handling.
 * Reduces repetitive boilerplate across all 18 registerTool callbacks.
 */
export function wrapHandler<T>(
  fn: (args: T) => unknown | Promise<unknown>,
  options?: { checkErrorField?: boolean },
): (
  args: T,
) => Promise<
  | ReturnType<typeof toolResult>
  | ReturnType<typeof toolError>
  | { content: Array<{ type: 'text'; text: string }> }
> {
  return async (args: T) => {
    try {
      const result = await fn(args);
      if (
        options?.checkErrorField &&
        result &&
        typeof result === 'object' &&
        'error' in result
      ) {
        return {
          content: [
            {
              type: 'text' as const,
              text: String((result as { error: unknown }).error),
            },
          ],
        };
      }
      return toolResult(result);
    } catch (error) {
      return toolError(error);
    }
  };
}
