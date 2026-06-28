import { describe, expect, it } from 'vitest';

import type { HookConfig } from '../../shared/configTypes.js';
import { buildStaticPayload } from '../injectStatic.js';
import { joinKeywords } from '../utils/joinKeywords.js';
import { tonePhrase } from '../utils/tonePhrase.js';

const BASE_CONFIG: HookConfig = {
  ratio: {
    codex: { value: 50, enabled: false },
    antigravity: { value: 50, enabled: false },
    claude: { value: 50, enabled: false },
  },
  intervention_strength: 0,
  keywords: { codex: 'code', antigravity: 'search', claude: 'reason' },
  option_flags: {
    codex: { yolo: false, sandbox: 'workspace-write' },
    antigravity: { sandbox: true, skip_permissions: false },
    claude: { permission_mode: 'acceptEdits' },
  },
  preamble: { codex: '', antigravity: '', claude: '' },
  recency_factor: { codex: 'off', antigravity: 'auto', claude: 'off' },
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
  it('includes a provider ratio line with each provider value', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        codex: { value: 40, enabled: true },
        antigravity: { value: 60, enabled: true },
        claude: { value: 20, enabled: true },
      },
    };
    const payload = buildStaticPayload(config);
    expect(payload).toContain('codex 40%');
    expect(payload).toContain('antigravity 60%');
    expect(payload).toContain('claude 20%');
  });

  it('lists active providers and intervention strength in output', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        ...BASE_CONFIG.ratio,
        claude: { value: 50, enabled: true },
      },
      intervention_strength: 1,
    };
    const payload = buildStaticPayload(config);
    expect(payload).toContain('Active providers: claude');
    expect(payload).toContain('proactive — delegate when reasonable');
  });

  it('shows none — run /setup when all providers are disabled', () => {
    const payload = buildStaticPayload(BASE_CONFIG);
    expect(payload).toContain('none — run /setup');
    expect(payload).toContain('Run /cennad:setup to enable a provider');
  });

  it('includes keyword mapping for each enabled provider', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        codex: { value: 50, enabled: true },
        antigravity: { value: 50, enabled: true },
        claude: { value: 50, enabled: false },
      },
      keywords: {
        codex: 'code, refactor',
        antigravity: 'search, youtube',
        claude: 'reasoning',
      },
    };
    const payload = buildStaticPayload(config);
    expect(payload).toContain('- codex → code, refactor');
    expect(payload).toContain('- antigravity → search, youtube');
    // claude is disabled, so its keyword line is omitted
    expect(payload).not.toContain('- claude →');
  });
});
