import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { YoutubeAddonConfig } from '../../../../types/index.js';
import { provisionAntigravityYoutube } from '../provisionAntigravity.js';
import { provisionYoutube } from '../provisionYoutube.js';

vi.mock('../provisionAntigravity.js', () => ({
  provisionAntigravityYoutube: vi.fn(),
}));
vi.mock('../provisionUserMcp.js', () => ({
  provisionUserMcpYoutube: vi.fn().mockResolvedValue({
    ok: true,
    action: 'unchanged',
  }),
}));

/**
 * Builds saved addon settings with the other targets disabled.
 * @param enabled Whether the addon is globally enabled.
 * @param antigravity Whether the Antigravity target is selected.
 * @param language Language passed to an active target.
 * @returns Settings whose effective Antigravity state requires both switches.
 */
function cfg(
  enabled: boolean,
  antigravity: boolean,
  language: 'en' | 'ko' = 'en',
): YoutubeAddonConfig {
  return {
    enabled,
    language,
    targets: { claude: false, codex: false, antigravity },
  };
}

beforeEach(() => {
  vi.mocked(provisionAntigravityYoutube).mockReset();
  vi.mocked(provisionAntigravityYoutube).mockResolvedValue({
    ok: true,
    action: 'removed',
  });
});

describe('provisionYoutube Antigravity transitions', () => {
  it.each([
    { name: 'no saved settings', prev: undefined },
    { name: 'addon disabled', prev: cfg(false, true) },
    { name: 'target deselected', prev: cfg(true, false) },
  ])('preserves manual registration with $name', async ({ prev }) => {
    const result = await provisionYoutube(cfg(false, false), prev);

    expect(provisionAntigravityYoutube).not.toHaveBeenCalled();
    expect(result.antigravity).toEqual({ ok: true, action: 'unchanged' });
  });

  it.each([
    { name: 'addon disabled', next: cfg(false, true) },
    { name: 'target deselected', next: cfg(true, false) },
  ])('removes an active registration when $name', async ({ next }) => {
    const result = await provisionYoutube(next, cfg(true, true));

    expect(provisionAntigravityYoutube).toHaveBeenCalledExactlyOnceWith(
      false,
      'en',
    );
    expect(result.antigravity).toEqual({ ok: true, action: 'removed' });
  });

  it.each([
    { name: 'new activation', prev: cfg(false, true) },
    { name: 'language update', prev: cfg(true, true) },
  ])('applies the active language on $name', async ({ prev }) => {
    vi.mocked(provisionAntigravityYoutube).mockResolvedValue({
      ok: true,
      action: 'added',
    });

    const result = await provisionYoutube(cfg(true, true, 'ko'), prev);

    expect(provisionAntigravityYoutube).toHaveBeenCalledExactlyOnceWith(
      true,
      'ko',
    );
    expect(result.antigravity).toEqual({ ok: true, action: 'added' });
  });

  it('does not retry a failed removal after inactive settings are saved', async () => {
    vi.mocked(provisionAntigravityYoutube).mockResolvedValue({
      ok: false,
      action: 'unchanged',
    });
    const inactive = cfg(true, false);

    const failed = await provisionYoutube(inactive, cfg(true, true));
    const later = await provisionYoutube(inactive, inactive);

    expect(failed.antigravity).toEqual({ ok: false, action: 'unchanged' });
    expect(later.antigravity).toEqual({ ok: true, action: 'unchanged' });
    expect(provisionAntigravityYoutube).toHaveBeenCalledExactlyOnceWith(
      false,
      'en',
    );
  });
});
