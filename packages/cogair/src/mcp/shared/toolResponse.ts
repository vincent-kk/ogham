export function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}

export function toolResult(result: unknown): {
  content: Array<{ type: 'text'; text: string }>;
} {
  const indent = process.env.COGAIR_PRETTY_JSON === '1' ? 2 : undefined;
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, mapReplacer, indent),
      },
    ],
  };
}

export function toolError(error: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

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
