/**
 * @file mapReplacer.ts
 * @description JSON.stringify replacer — Map/Set → 일반 객체/배열
 */
export function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}
