export type EventLike = Record<string, unknown>;

export function isObject(value: unknown): value is EventLike {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
