import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergeTimeouts } from '../mergeTimeouts.js';

const defaults = DEFAULT_CONFIG.timeouts;

describe('mergeTimeouts', () => {
  it('returns defaults when raw is missing or not an object', () => {
    expect(mergeTimeouts(undefined)).toEqual(defaults);
    expect(mergeTimeouts(null)).toEqual(defaults);
    expect(mergeTimeouts('600000')).toEqual(defaults);
  });

  it('keeps stored values and fills the tiers a config does not carry', () => {
    const result = mergeTimeouts({
      idle_ms: 60_000,
      hard_cap_ms: { apex: 7_200_000 },
    }) as typeof defaults;
    expect(result.idle_ms).toBe(60_000);
    expect(result.hard_cap_ms.apex).toBe(7_200_000);
    expect(result.hard_cap_ms.high).toBe(defaults.hard_cap_ms.high);
    expect(result.hard_cap_ms.low).toBe(defaults.hard_cap_ms.low);
  });

  it('rejects non-positive and non-numeric durations', () => {
    const result = mergeTimeouts({
      idle_ms: 0,
      hard_cap_ms: { apex: -1, high: 'soon', mid: Number.NaN },
    }) as typeof defaults;
    expect(result.idle_ms).toBe(defaults.idle_ms);
    expect(result.hard_cap_ms.apex).toBe(defaults.hard_cap_ms.apex);
    expect(result.hard_cap_ms.high).toBe(defaults.hard_cap_ms.high);
    expect(result.hard_cap_ms.mid).toBe(defaults.hard_cap_ms.mid);
  });

  it('floors fractional milliseconds so the schema stays integer-valued', () => {
    const result = mergeTimeouts({ idle_ms: 1500.7 }) as typeof defaults;
    expect(result.idle_ms).toBe(1500);
  });

  it('ignores a legacy spawn_timeout_ms rather than reusing it as a cap', () => {
    const result = mergeTimeouts({
      spawn_timeout_ms: 600_000,
    }) as typeof defaults;
    expect(result).toEqual(defaults);
  });
});
