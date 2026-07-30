/**
 * @file toolResponse.ts
 * @description MCP tool common utilities
 */

/** JSON.stringify replacer — Map/Set → plain object/array */
export function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}

/** MCP success response format */
export function toolResult(result: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, mapReplacer, 2),
      },
    ],
  };
}

/** MCP error response format */
export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const details =
    error instanceof Error
      ? ((error as { details?: unknown }).details ?? error.cause)
      : undefined;
  const text =
    details === undefined
      ? `Error: ${message}`
      : `Error: ${message}\n${JSON.stringify(details, mapReplacer, 2)}`;
  return {
    content: [{ type: "text" as const, text }],
    isError: true as const,
  };
}

/** Wrap a tool handler with standard try/catch */
export function wrapHandler<T>(fn: (args: T) => unknown | Promise<unknown>) {
  return async (args: T) => {
    try {
      const result = await fn(args);
      return toolResult(result);
    } catch (error) {
      return toolError(error);
    }
  };
}
