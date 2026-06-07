import { type EventLike, isObject } from './isObject.js';

export function readObject(obj: EventLike, key: string): EventLike | null {
  const value = obj[key];
  return isObject(value) ? value : null;
}
