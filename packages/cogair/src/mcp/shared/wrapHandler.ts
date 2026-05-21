import { toolError } from './toolError.js';
import { toolResult } from './toolResult.js';

export function wrapHandler<T>(
  handler: (args: T) => unknown | Promise<unknown>,
): (
  args: T,
) => Promise<ReturnType<typeof toolResult> | ReturnType<typeof toolError>> {
  return async (args: T) => {
    try {
      return toolResult(await handler(args));
    } catch (error) {
      return toolError(error);
    }
  };
}
