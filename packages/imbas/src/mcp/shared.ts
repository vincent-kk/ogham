/**
 * @file shared.ts
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
        type: 'text' as const,
        text: JSON.stringify(result, mapReplacer, 2),
      },
    ],
  };
}

/** MCP error response format */
export function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}
