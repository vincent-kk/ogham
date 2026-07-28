import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

// Floors to a whole millisecond, but never below 1: the schema this feeds requires a
// positive integer, so flooring a fractional value to 0 would make the sanitizer
// produce the one thing it exists to prevent — a config the parse discards whole.
function positiveMs(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0
    ? Math.max(1, Math.floor(raw))
    : fallback;
}

// The pre-liveness schema stored a single `spawn_timeout_ms` wall-clock value. It is
// not carried over: that value was a ceiling on total runtime, and reusing it as a cap
// would kill an apex run minutes in — the opposite of what tiered caps are for.
export function mergeTimeouts(raw: unknown): unknown {
  const defaults = DEFAULT_CONFIG.timeouts;
  if (!isPlainObject(raw)) return defaults;
  const caps = isPlainObject(raw.hard_cap_ms) ? raw.hard_cap_ms : {};
  return {
    idle_ms: positiveMs(raw.idle_ms, defaults.idle_ms),
    hard_cap_ms: {
      apex: positiveMs(caps.apex, defaults.hard_cap_ms.apex),
      high: positiveMs(caps.high, defaults.hard_cap_ms.high),
      mid: positiveMs(caps.mid, defaults.hard_cap_ms.mid),
      low: positiveMs(caps.low, defaults.hard_cap_ms.low),
    },
  };
}
