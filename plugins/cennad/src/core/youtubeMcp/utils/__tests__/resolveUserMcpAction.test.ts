import { describe, expect, it } from 'vitest';

import type { YoutubeAddonConfig } from '../../../../types/index.js';
import { resolveUserMcpAction } from '../resolveUserMcpAction.js';

function cfg(
  enabled: boolean,
  codex: boolean,
  language: 'en' | 'ko' = 'en',
  claude = false,
): YoutubeAddonConfig {
  return {
    enabled,
    language,
    targets: { claude, codex, antigravity: true },
  };
}

describe('resolveUserMcpAction', () => {
  it('adds when codex is desired and there is no prior config', () => {
    expect(resolveUserMcpAction('codex', cfg(true, true))).toBe('add');
  });

  it('removes when codex is not desired and there is no prior config', () => {
    expect(resolveUserMcpAction('codex', cfg(false, true))).toBe('remove');
    expect(resolveUserMcpAction('codex', cfg(true, false))).toBe('remove');
  });

  it('skips when codex stays desired with the same language', () => {
    expect(
      resolveUserMcpAction(
        'codex',
        cfg(true, true, 'ko'),
        cfg(true, true, 'ko'),
      ),
    ).toBe('skip');
  });

  it('adds when codex stays desired but the language changed', () => {
    expect(
      resolveUserMcpAction(
        'codex',
        cfg(true, true, 'ko'),
        cfg(true, true, 'en'),
      ),
    ).toBe('add');
  });

  it('skips when codex was and stays undesired', () => {
    expect(
      resolveUserMcpAction('codex', cfg(false, false), cfg(false, false)),
    ).toBe('skip');
  });

  it('removes when codex transitions from desired to undesired', () => {
    expect(
      resolveUserMcpAction('codex', cfg(false, true), cfg(true, true)),
    ).toBe('remove');
  });

  it('decides Claude independently from the Codex target', () => {
    expect(resolveUserMcpAction('claude', cfg(true, false, 'en', true))).toBe(
      'add',
    );
    expect(resolveUserMcpAction('codex', cfg(true, false, 'en', true))).toBe(
      'remove',
    );
  });
});
