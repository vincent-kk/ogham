import { describe, expect, it } from 'vitest';

import type { HookConfig, HookCounter } from '../../shared/configTypes.js';
import { buildDynamicPayload } from '../injectDynamic.js';
import { asNonNegInt } from '../utils/asNonNegInt.js';

describe('asNonNegInt', () => {
  it('returns the integer as-is for a valid non-negative integer', () => {
    expect(asNonNegInt(5)).toBe(5);
  });

  it('clamps negative numbers to 0', () => {
    expect(asNonNegInt(-3)).toBe(0);
  });

  it('floors positive floats', () => {
    expect(asNonNegInt(2.9)).toBe(2);
  });

  it('returns 0 for non-number input', () => {
    expect(asNonNegInt('42')).toBe(0);
  });

  it('returns 0 for non-finite values (Infinity)', () => {
    expect(asNonNegInt(Infinity)).toBe(0);
  });
});

const BASE_CONFIG: HookConfig = {
  ratio: {
    codex: { value: 30, enabled: true },
    antigravity: { value: 70, enabled: true },
    claude: { value: 50, enabled: false },
  },
  intervention_strength: 0,
  keywords: { codex: 'code', antigravity: 'agy', claude: 'reason' },
  option_flags: {
    codex: { yolo: false, sandbox: 'read-only' },
    antigravity: { sandbox: false, skip_permissions: false },
    claude: { permission_mode: 'acceptEdits' },
  },
  preamble: { codex: '', antigravity: '', claude: '' },
  recency_factor: { codex: 'off', antigravity: 'off', claude: 'off' },
};

const ZERO_COUNTER: HookCounter = {
  status: 'measured',
  codex: 0,
  antigravity: 0,
  claude: 0,
};

describe('buildDynamicPayload', () => {
  it('shows "No delegations yet this session." with no share gap noise', () => {
    const out = buildDynamicPayload(BASE_CONFIG, ZERO_COUNTER, '', 'claude');
    expect(out.split('\n')[0]).toBe(
      '[cennad] No delegations yet this session.',
    );
  });

  it('condenses counts and the under-share conclusion into one line', () => {
    const counter: HookCounter = { ...ZERO_COUNTER, codex: 3, antigravity: 1 };
    const out = buildDynamicPayload(BASE_CONFIG, counter, '', 'claude');
    // counts 3/1/0 → current 75/25; weights 30/70 → antigravity is 45pt short
    expect(out.split('\n')[0]).toBe(
      '[cennad] Calls: codex 3 · antigravity 1 · claude 0 (total 4) · under share: antigravity 45pt',
    );
  });

  it('keeps unidentified dynamic turns silent', () => {
    const outputs = Array.from({ length: 2 }, () =>
      buildDynamicPayload(
        BASE_CONFIG,
        { ...ZERO_COUNTER, status: 'unidentified' },
        '',
        'claude',
      ),
    );
    expect(outputs).toEqual(['', '']);
    expect(outputs.join('\n')).not.toContain(
      'Delegation counts unavailable (unidentified).',
    );
  });

  it('distinguishes a missing counter file from a measured zero', () => {
    const out = buildDynamicPayload(
      BASE_CONFIG,
      { ...ZERO_COUNTER, status: 'missing' },
      '',
      'claude',
    );
    expect(out.split('\n')[0]).toBe(
      '[cennad] Delegation counts unavailable (missing).',
    );
    expect(out).not.toContain('No delegations yet this session.');
  });

  it('stays two lines when nothing in the prompt matches a domain', () => {
    const lines = buildDynamicPayload(
      BASE_CONFIG,
      ZERO_COUNTER,
      'what time is it',
      'claude',
    ).split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('codex or antigravity');
  });

  it('adds a third line naming the owner when a keyword matches', () => {
    const lines = buildDynamicPayload(
      BASE_CONFIG,
      ZERO_COUNTER,
      'please fix the code',
      'claude',
    ).split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe(
      'Matched "code" → /cennad:codex or here? Decide before starting.',
    );
  });

  it('swaps the nudge with the intervention strength', () => {
    const strong = buildDynamicPayload(
      { ...BASE_CONFIG, intervention_strength: 2 },
      ZERO_COUNTER,
      '',
      'claude',
    );
    const subtle = buildDynamicPayload(
      { ...BASE_CONFIG, intervention_strength: -2 },
      ZERO_COUNTER,
      '',
      'claude',
    );
    expect(strong).toContain('needs a listed exception');
    expect(subtle).toContain('only when asked by name');
  });

  it('never elects the host own provider, even on a keyword match', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        ...BASE_CONFIG.ratio,
        claude: { value: 50, enabled: true },
      },
    };
    const out = buildDynamicPayload(
      config,
      ZERO_COUNTER,
      'give me a reason',
      'claude',
    );
    expect(out).not.toContain('/cennad:claude');
    expect(out).toContain('codex or antigravity');
  });

  it('reports crosscheck-only when nothing is left to auto-route', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        codex: { value: 30, enabled: true, crosscheck_only: true },
        antigravity: { value: 70, enabled: false },
        claude: { value: 50, enabled: false },
      },
    };
    const out = buildDynamicPayload(config, ZERO_COUNTER, 'code', 'claude');
    expect(out).toContain(
      'Every enabled provider is crosscheck-only here; nothing is auto-routed.',
    );
  });

  it('drops the nudge and points at setup when every provider is disabled', () => {
    const config: HookConfig = {
      ...BASE_CONFIG,
      ratio: {
        codex: { value: 0, enabled: false },
        antigravity: { value: 0, enabled: false },
        claude: { value: 0, enabled: false },
      },
    };
    const out = buildDynamicPayload(config, ZERO_COUNTER, '', 'claude');
    expect(out).toBe('[cennad] No provider enabled — run /cennad:setup.');
  });
});
