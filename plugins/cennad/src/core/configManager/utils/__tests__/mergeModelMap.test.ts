import { describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../../constants/defaults.js';
import { mergeModelMap } from '../mergeModelMap.js';

const defaults = DEFAULT_CONFIG.model_map;

describe('mergeModelMap', () => {
  it('returns defaults when raw is undefined', () => {
    expect(mergeModelMap(undefined)).toEqual(defaults);
  });

  it('returns defaults when raw is null', () => {
    expect(mergeModelMap(null)).toEqual(defaults);
  });

  it('preserves a fully-specified antigravity map and fills codex/claude defaults', () => {
    const raw = {
      antigravity: {
        high: { model: 'Gemini 3.1 Pro', effort: 'High' },
        mid: { model: 'Gemini 3.5 Flash', effort: 'Medium' },
        low: { model: 'GPT-OSS 120B' },
      },
    };
    expect(mergeModelMap(raw)).toEqual({
      codex: defaults.codex,
      antigravity: {
        high: { model: 'Gemini 3.1 Pro', effort: 'High' },
        mid: { model: 'Gemini 3.5 Flash', effort: 'Medium' },
        low: { model: 'GPT-OSS 120B' },
      },
      claude: defaults.claude,
    });
  });

  it('does not inherit default effort for an antigravity tier that omits effort', () => {
    const raw = { antigravity: { low: { model: 'GPT-OSS 120B' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity.low).toEqual({ model: 'GPT-OSS 120B' });
    expect(result.antigravity.low).not.toHaveProperty('effort');
  });

  it('fills missing antigravity tiers from defaults when only high is provided', () => {
    const raw = {
      antigravity: { high: { model: 'CustomHigh', effort: 'High' } },
    };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity.high).toEqual({
      model: 'CustomHigh',
      effort: 'High',
    });
    expect(result.antigravity.mid).toEqual(defaults.antigravity.mid);
    expect(result.antigravity.low).toEqual(defaults.antigravity.low);
  });

  it('returns defaults when raw is a string', () => {
    expect(mergeModelMap('not-an-object')).toEqual(defaults);
  });

  it('migrates a legacy flat-string antigravity model_map, splitting model/effort', () => {
    const raw = {
      antigravity: {
        high: 'Gemini 3.1 Pro (High)',
        mid: 'Gemini 3.5 Flash (Medium)',
        low: 'GPT-OSS 120B',
      },
    };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.antigravity.high).toEqual({
      model: 'Gemini 3.1 Pro',
      effort: 'High',
    });
    expect(result.antigravity.mid).toEqual({
      model: 'Gemini 3.5 Flash',
      effort: 'Medium',
    });
    expect(result.antigravity.low).toEqual({ model: 'GPT-OSS 120B' });
  });

  it('returns defaults when raw is an array', () => {
    expect(mergeModelMap([{ antigravity: { high: 'X' } }])).toEqual(defaults);
  });

  it('uses default antigravity block when raw.antigravity is null', () => {
    const result = mergeModelMap({ antigravity: null }) as typeof defaults;
    expect(result.antigravity).toEqual(defaults.antigravity);
  });

  it('merges a fully-specified claude tier {model, effort}', () => {
    const raw = {
      claude: {
        high: { model: 'sonnet', effort: 'high' },
        mid: { model: 'opus', effort: 'medium' },
        low: { model: 'haiku' },
      },
    };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.claude.high).toEqual({ model: 'sonnet', effort: 'high' });
    expect(result.claude.mid).toEqual({ model: 'opus', effort: 'medium' });
  });

  it('does not inherit default effort for a claude tier that omits effort', () => {
    const raw = { claude: { low: { model: 'haiku' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.claude.low).toEqual({ model: 'haiku' });
    expect(result.claude.low).not.toHaveProperty('effort');
  });

  it('fills missing claude tiers from defaults when only one tier is provided', () => {
    const raw = { claude: { high: { model: 'fable', effort: 'max' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.claude.high).toEqual({ model: 'fable', effort: 'max' });
    expect(result.claude.mid).toEqual(defaults.claude.mid);
    expect(result.claude.low).toEqual(defaults.claude.low);
  });

  it('falls back to the default claude tier when a tier lacks a string model', () => {
    const raw = { claude: { high: { effort: 'max' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.claude.high).toEqual(defaults.claude.high);
  });

  it('merges a fully-specified codex tier {model, effort}', () => {
    const raw = {
      codex: {
        high: { model: 'gpt-5.6-terra', effort: 'ultra' },
        mid: { model: 'gpt-5.5', effort: 'xhigh' },
        low: { model: 'gpt-5.4-mini' },
      },
    };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.codex.high).toEqual({
      model: 'gpt-5.6-terra',
      effort: 'ultra',
    });
    expect(result.codex.mid).toEqual({ model: 'gpt-5.5', effort: 'xhigh' });
  });

  it('does not inherit default effort for a codex tier that omits effort', () => {
    const raw = { codex: { low: { model: 'gpt-5.4-mini' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.codex.low).toEqual({ model: 'gpt-5.4-mini' });
    expect(result.codex.low).not.toHaveProperty('effort');
  });

  it('fills missing codex tiers from defaults when only one tier is provided', () => {
    const raw = { codex: { high: { model: 'gpt-5.5', effort: 'xhigh' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.codex.high).toEqual({ model: 'gpt-5.5', effort: 'xhigh' });
    expect(result.codex.mid).toEqual(defaults.codex.mid);
    expect(result.codex.low).toEqual(defaults.codex.low);
  });

  it('falls back to the default codex tier when a tier lacks a string model', () => {
    const raw = { codex: { high: { effort: 'ultra' } } };
    const result = mergeModelMap(raw) as typeof defaults;
    expect(result.codex.high).toEqual(defaults.codex.high);
  });

  it('does not mutate DEFAULT_CONFIG.model_map', () => {
    const before = JSON.parse(JSON.stringify(defaults));
    mergeModelMap({ antigravity: { high: { model: 'Mutator' } } });
    expect(DEFAULT_CONFIG.model_map).toEqual(before);
  });
});
