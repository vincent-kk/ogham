import { describe, expect, it } from 'vitest';

import { handleOpenSettings } from '../handler.js';

describe('handleOpenSettings (Phase 4 placeholder)', () => {
  it('returns an empty url with the Phase 5 placeholder message', async () => {
    const result = await handleOpenSettings({});
    expect(result.url).toBe('');
    expect(result.reused).toBe(false);
    expect(result.message).toMatch(/Phase 5/);
  });
});
