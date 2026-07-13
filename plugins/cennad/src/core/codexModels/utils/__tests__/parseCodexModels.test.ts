import { describe, expect, it } from 'vitest';

import { parseCodexModels } from '../parseCodexModels.js';

function catalog(models: unknown[]): string {
  return JSON.stringify({ models });
}

const SOL = {
  slug: 'gpt-5.6-sol',
  display_name: 'GPT-5.6-Sol',
  description: 'Latest frontier agentic coding model.',
  default_reasoning_level: 'medium',
  supported_reasoning_levels: [
    { effort: 'low', description: 'Fast responses' },
    { effort: 'medium', description: 'Balances speed and depth' },
    { effort: 'high', description: 'Greater depth' },
    { effort: 'xhigh', description: 'Extra high depth' },
    { effort: 'max', description: 'Maximum depth' },
    { effort: 'ultra', description: 'Maximum with delegation' },
  ],
  visibility: 'list',
  supported_in_api: true,
  priority: 1,
};

describe('parseCodexModels', () => {
  it('extracts slug, efforts, default effort, and description', () => {
    expect(parseCodexModels(catalog([SOL]))).toEqual([
      {
        slug: 'gpt-5.6-sol',
        efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
        default_effort: 'medium',
        description: 'Latest frontier agentic coding model.',
      },
    ]);
  });

  it('preserves catalog order so the frontier model stays first', () => {
    const luna = { ...SOL, slug: 'gpt-5.6-luna', priority: 3 };
    const models = parseCodexModels(catalog([SOL, luna]));
    expect(models.map((model) => model.slug)).toEqual([
      'gpt-5.6-sol',
      'gpt-5.6-luna',
    ]);
  });

  it('drops hidden entries such as codex-auto-review', () => {
    const hidden = { ...SOL, slug: 'codex-auto-review', visibility: 'hide' };
    expect(parseCodexModels(catalog([SOL, hidden]))).toHaveLength(1);
  });

  it('drops models that cannot be driven through the API', () => {
    const noApi = { ...SOL, slug: 'gpt-5.6-terra', supported_in_api: false };
    expect(parseCodexModels(catalog([SOL, noApi]))).toHaveLength(1);
  });

  it('filters effort levels cennad does not model', () => {
    const withUnknown = {
      ...SOL,
      supported_reasoning_levels: [
        { effort: 'minimal' },
        { effort: 'low' },
        { effort: 'high' },
      ],
    };
    expect(parseCodexModels(catalog([withUnknown]))[0].efforts).toEqual([
      'low',
      'high',
    ]);
  });

  it('drops a model whose advertised efforts are all unknown', () => {
    const alien = {
      ...SOL,
      supported_reasoning_levels: [{ effort: 'minimal' }, { effort: 'none' }],
    };
    expect(parseCodexModels(catalog([alien]))).toEqual([]);
  });

  it('omits default_effort when the catalog default is not a known level', () => {
    const odd = { ...SOL, default_reasoning_level: 'minimal' };
    expect(parseCodexModels(catalog([odd]))[0]).not.toHaveProperty(
      'default_effort',
    );
  });

  it('returns an empty list for empty, non-JSON, or shapeless output', () => {
    expect(parseCodexModels('')).toEqual([]);
    expect(parseCodexModels('not json at all')).toEqual([]);
    expect(parseCodexModels('{"models":"nope"}')).toEqual([]);
    expect(
      parseCodexModels(JSON.stringify({ models: [{ slug: 42 }] })),
    ).toEqual([]);
  });
});
