/** JSON.stringify replacer that converts Map/Set to plain objects/arrays */
export function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  if (value instanceof Set) {
    return [...value];
  }
  return value;
}

export function toolResult(result: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(result, mapReplacer, 2) },
    ],
  };
}

export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

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
