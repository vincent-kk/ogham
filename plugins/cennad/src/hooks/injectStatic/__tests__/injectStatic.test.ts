import { describe, expect, it } from 'vitest';

import type { HookConfig } from '../../shared/configTypes.js';
import { buildStaticPayload } from '../injectStatic.js';
import { joinKeywords } from '../utils/joinKeywords.js';
import { tonePhrase } from '../utils/tonePhrase.js';

const BASE_CONFIG: HookConfig = {
  ratio: {
    gemini: { value: 50, enabled: false },
    codex: { value: 50, enabled: false },
    antigravity: { value: 50, enabled: false },
  },
  intervention_strength: 0,
  keywords: { gemini: 'research', codex: 'code', antigravity: 'search' },
  option_flags: {
    gemini: { yolo: true, sandbox: true, sandbox_backend: 'auto' },
    codex: { yolo: false, sandbox: 'workspace-write' },
    antigravity: { sandbox: true, skip_permissions: false },
  },
  preamble: { gemini: '', codex: '', antigravity: '' },
  recency_factor: { gemini: 'auto', codex: 'off', antigravity: 'auto' },
};

describe('joinKeywords', () => {
  it('returns the trimmed keyword string as-is when non-empty', () => {
    expect(joinKeywords('research, search')).toBe('research, search');
  });

  it('returns (none) for an empty string', () => {
    expect(joinKeywords('')).toBe('(none)');
  });

  it('returns (none) for a whitespace-only string', () => {
    expect(joinKeywords('   ')).toBe('(none)');
  });

  it('trims surrounding whitespace from a non-empty string', () => {
    expect(joinKeywords('  code  ')).toBe('code');
  });
});

describe('tonePhrase', () => {
  it('returns very conservative phrase for strength -2', () => {
    expect(tonePhrase(-2)).toBe(
      'very conservative — prefer Claude unless strongly indicated',
    );
  });

  it('returns conservative phrase for strength -1', () => {
    expect(tonePhrase(-1)).toBe('conservative — bias to Claude');
  });

  it('returns balanced phrase for strength 0', () => {
    expect(tonePhrase(0)).toBe('balanced — follow ratio and keywords');
  });

  it('returns proactive phrase for strength 1', () => {
    expect(tonePhrase(1)).toBe('proactive — delegate when reasonable');
  });

  it('returns aggressive phrase for strength 2', () => {
    expect(tonePhrase(2)).toBe(
      'aggressive — delegate by default when any keyword matches',
    );
  });
});

describe('buildStaticPayload', () => {
  it('includes provider ratio line with antigravity as the active google engine', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        ...BASE_CONFIG.ratio,
        antigravity: { value: 60, enabled: true },
        codex: { value: 40, enabled: true },
      },
    };
    const payload = buildStaticPayload(config);
    expect(payload).toContain('antigravity 60%');
    expect(payload).toContain('codex 40%');
  });

  it('lists active providers and intervention strength in output', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        ...BASE_CONFIG.ratio,
        gemini: { value: 50, enabled: true },
      },
      intervention_strength: 1,
    };
    const payload = buildStaticPayload(config);
    expect(payload).toContain('Active providers: gemini');
    expect(payload).toContain('proactive — delegate when reasonable');
  });

  it('shows none — run /setup when all providers are disabled', () => {
    const payload = buildStaticPayload(BASE_CONFIG);
    expect(payload).toContain('none — run /setup');
    expect(payload).toContain('Run /cennad:setup to enable a provider');
  });

  it('includes keyword mapping for enabled google provider and codex', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        ...BASE_CONFIG.ratio,
        antigravity: { value: 50, enabled: true },
        codex: { value: 50, enabled: true },
      },
      keywords: {
        gemini: 'research',
        codex: 'code, refactor',
        antigravity: 'search, youtube',
      },
    };
    const payload = buildStaticPayload(config);
    expect(payload).toContain('antigravity → search, youtube');
    expect(payload).toContain('codex  → code, refactor');
  });
});
