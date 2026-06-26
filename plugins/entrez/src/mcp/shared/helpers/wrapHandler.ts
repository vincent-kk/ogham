import { toolResult } from "./toolResult.js";
import { toolError } from "./toolError.js";

/** Wrap a tool handler with standard try/catch + MCP response formatting. */
export function wrapHandler<T>(fn: (args: T) => unknown | Promise<unknown>) {
  return async (args: T) => {
    try {
      return toolResult(await fn(args));
    } catch (error) {
      return toolError(error);
    }
  };
}
