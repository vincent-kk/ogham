import { describe, expect, it } from 'vitest';

import type { HookConfig } from '../../shared/configTypes.js';
import { buildStaticPayload } from '../injectStatic.js';
import { joinKeywords } from '../utils/joinKeywords.js';

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

const allEnabled = (strength: HookConfig['intervention_strength'] = 0) => ({
  ...BASE_CONFIG,
  ratio: {
    codex: { value: 65, enabled: true },
    antigravity: { value: 25, enabled: true },
    claude: { value: 10, enabled: true },
  },
  intervention_strength: strength,
});

describe('joinKeywords', () => {
  it('returns the trimmed keyword string as-is when non-empty', () => {
    expect(joinKeywords('research, search')).toBe('research, search');
  });

  it('returns (none) for an empty string', () => {
    expect(joinKeywords('')).toBe('(none)');
  });

  it('returns the caller fallback for a whitespace-only string', () => {
    expect(joinKeywords('   ')).toBe('(none)');
    expect(joinKeywords('   ', 'live web search')).toBe('live web search');
  });

  it('trims surrounding whitespace from a non-empty string', () => {
    expect(joinKeywords('  code  ')).toBe('code');
  });
});

describe('buildStaticPayload', () => {
  it('includes a provider ratio line with each provider value', () => {
    const payload = buildStaticPayload(allEnabled(), 'claude');
    expect(payload).toContain(
      'Provider ratio: codex 65% · antigravity 25% · claude 10%',
    );
  });

  it('separates the crosscheck roster from the auto-routing roster', () => {
    const payload = buildStaticPayload(allEnabled(), 'claude');
    // every enabled provider stays a crosscheck participant...
    expect(payload).toContain('Active providers: codex, antigravity, claude');
    // ...while the host's own model drops out of auto-routing
    expect(payload).toContain('Auto-routing: codex, antigravity');
  });

  it('labels the intervention strength with the settings-slider word', () => {
    expect(buildStaticPayload(allEnabled(1), 'claude')).toContain(
      'Intervention strength: 1 (active)',
    );
  });

  it('swaps the routing stance with the intervention strength', () => {
    const strong = buildStaticPayload(allEnabled(2), 'claude');
    const subtle = buildStaticPayload(allEnabled(-2), 'claude');
    expect(strong).toContain('Nothing else is an exception');
    expect(subtle).not.toContain('Nothing else is an exception');
    expect(subtle).toContain('only when the user asks for a provider by name');
  });

  it('excludes codex instead when codex is the host', () => {
    const payload = buildStaticPayload(allEnabled(), 'codex');
    expect(payload).toContain('Auto-routing: antigravity, claude');
    expect(payload).toContain(
      "- code → `/cennad:codex` (crosscheck only — this session's own model)",
    );
  });

  it('replaces the stance when nothing is left to auto-route', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        ...BASE_CONFIG.ratio,
        claude: { value: 50, enabled: true },
      },
    };
    const payload = buildStaticPayload(config, 'claude');
    expect(payload).toContain(
      'Auto-routing: none — every enabled provider is crosscheck-only',
    );
    expect(payload).toContain('Nothing is auto-routed here');
    expect(payload).not.toContain('Nothing else is an exception');
  });

  it('shows none — run /setup and no domain section when all providers are disabled', () => {
    const payload = buildStaticPayload(BASE_CONFIG, 'claude');
    expect(payload).toContain('Active providers: none — run /setup');
    expect(payload).toContain('Run /cennad:setup to enable a provider');
    expect(payload).not.toContain('Domains with owners');
  });
});
