import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { TimeoutsConfigSchema } from '../../../types/index.js';
import { mergeTimeouts } from '../utils/mergeTimeouts.js';

describe('mergeTimeouts', () => {
  // The sanitizer runs to keep a hand-edited config loadable, so producing a value
  // its own schema rejects is the one thing it must never do: the parse failure
  // discards the whole file and every other setting reverts to defaults.
  it('never yields a value TimeoutsConfigSchema rejects', () => {
    const merged = mergeTimeouts({
      idle_ms: 0.5,
      hard_cap_ms: { apex: 0.9, high: 0.1 },
    });
    expect(TimeoutsConfigSchema.safeParse(merged).success).toBe(true);
    expect(merged).toMatchObject({ idle_ms: 1, hard_cap_ms: { apex: 1 } });
  });

  it('keeps whole values and falls back for unusable ones', () => {
    const merged = mergeTimeouts({ idle_ms: 90_000, hard_cap_ms: { mid: -1 } });
    expect(merged).toMatchObject({
      idle_ms: 90_000,
      hard_cap_ms: { mid: DEFAULT_CONFIG.timeouts.hard_cap_ms.mid },
    });
  });
});
