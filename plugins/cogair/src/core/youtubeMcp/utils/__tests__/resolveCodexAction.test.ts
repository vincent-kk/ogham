import { describe, expect, it } from 'vitest';

import type { YoutubeAddonConfig } from '../../../../types/index.js';
import { resolveCodexAction } from '../resolveCodexAction.js';

function cfg(
  enabled: boolean,
  codex: boolean,
  language: 'en' | 'ko' = 'en',
): YoutubeAddonConfig {
  return { enabled, language, targets: { codex, antigravity: true } };
}

describe('resolveCodexAction', () => {
  it('adds when codex is desired and there is no prior config', () => {
    expect(resolveCodexAction(cfg(true, true))).toBe('add');
  });

  it('removes when codex is not desired and there is no prior config', () => {
    expect(resolveCodexAction(cfg(false, true))).toBe('remove');
    expect(resolveCodexAction(cfg(true, false))).toBe('remove');
  });

  it('skips when codex stays desired with the same language', () => {
    expect(
      resolveCodexAction(cfg(true, true, 'ko'), cfg(true, true, 'ko')),
    ).toBe('skip');
  });

  it('adds when codex stays desired but the language changed', () => {
    expect(
      resolveCodexAction(cfg(true, true, 'ko'), cfg(true, true, 'en')),
    ).toBe('add');
  });

  it('skips when codex was and stays undesired', () => {
    expect(resolveCodexAction(cfg(false, false), cfg(false, false))).toBe(
      'skip',
    );
  });

  it('removes when codex transitions from desired to undesired', () => {
    expect(resolveCodexAction(cfg(false, true), cfg(true, true))).toBe(
      'remove',
    );
  });
});
