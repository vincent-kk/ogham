import type { EventLike } from './isObject.js';

export function readString(obj: EventLike, key: string): string | null {
  const value = obj[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
