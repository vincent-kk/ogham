/** JSON.stringify replacer — Map → object, Set → array. */
export function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}

/** MCP success response: JSON-serialized result as a text content block. */
export function toolResult(result: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(result, mapReplacer, 2) },
    ],
  };
}
