import { THREAD_KEYS } from '../constants/threadKeys.js';

import type { EventLike } from './isObject.js';
import { readString } from './readString.js';

export function findThreadId(...sources: EventLike[]): string | null {
  for (const source of sources) {
    for (const key of THREAD_KEYS) {
      const value = readString(source, key);
      if (value) return value;
    }
  }
  return null;
}
