/**
 * @file utils/objects.ts
 * @description Object utility functions
 */

/** Immutably set a value at a nested path (dot-separated parts array). */
export function setNested(
  obj: unknown,
  parts: string[],
  value: unknown,
): unknown {
  if (parts.length === 0) return value;

  const [head, ...rest] = parts as [string, ...string[]];
  const current = (obj !== null && typeof obj === 'object')
    ? (obj as Record<string, unknown>)
    : {};

  return {
    ...current,
    [head]: setNested(current[head], rest, value),
  };
}
