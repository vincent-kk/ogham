import { describe, expect, it } from 'vitest';

import { parseModels } from '../parseModels.js';

describe('parseModels', () => {
  // Basic (happy-path)

  it('parses a JSON array of strings', () => {
    const stdout = JSON.stringify(['gemini-2.0-flash', 'gemini-1.5-pro']);
    expect(parseModels(stdout)).toEqual(['gemini-2.0-flash', 'gemini-1.5-pro']);
  });

  it('parses a JSON array of {name} objects', () => {
    const stdout = JSON.stringify([{ name: 'model-a' }, { name: 'model-b' }]);
    expect(parseModels(stdout)).toEqual(['model-a', 'model-b']);
  });

  it('parses a JSON object with a models field', () => {
    const stdout = JSON.stringify({
      models: ['gemini-pro', 'gemini-flash'],
      next_page_token: '',
    });
    expect(parseModels(stdout)).toEqual(['gemini-pro', 'gemini-flash']);
  });

  // Complex (edge cases)

  it('returns [] for empty string', () => {
    expect(parseModels('')).toEqual([]);
  });

  it('returns [] for whitespace-only string', () => {
    expect(parseModels('   \n\t  ')).toEqual([]);
  });

  it('falls back to line parsing for non-JSON garbage', () => {
    const stdout = 'model-x\nmodel-y\nmodel-z';
    expect(parseModels(stdout)).toEqual(['model-x', 'model-y', 'model-z']);
  });

  it('drops decorative lines (starting with - = * # | +) in plain text', () => {
    const stdout = [
      '+------------------+',
      '| model-one        |',
      '===================',
      '  model-two  ',
      '* footnote',
      '# header',
      'model-three',
    ].join('\n');
    // Lines starting with |, +, =, *, # are all dropped by the decorative filter.
    expect(parseModels(stdout)).toEqual(['model-two', 'model-three']);
  });

  it('handles CRLF line endings in plain text', () => {
    const stdout = 'model-alpha\r\nmodel-beta\r\n';
    expect(parseModels(stdout)).toEqual(['model-alpha', 'model-beta']);
  });

  it('deduplicates repeated model names', () => {
    const stdout = JSON.stringify(['gemini-pro', 'gemini-flash', 'gemini-pro']);
    expect(parseModels(stdout)).toEqual(['gemini-pro', 'gemini-flash']);
  });

  it('deduplicates repeated lines in plain text fallback', () => {
    const stdout = 'model-a\nmodel-b\nmodel-a';
    expect(parseModels(stdout)).toEqual(['model-a', 'model-b']);
  });

  it('filters empty entries from mixed JSON array (strings + objects + empties)', () => {
    const stdout = JSON.stringify([
      'valid-model',
      { name: 'object-model' },
      '',
      '   ',
      { name: '' },
      { other: 'no-name' },
      42,
    ]);
    expect(parseModels(stdout)).toEqual(['valid-model', 'object-model']);
  });

  it('preserves model names verbatim without normalization', () => {
    const stdout = JSON.stringify(['Gemini 2.0 Flash Experimental']);
    expect(parseModels(stdout)).toEqual(['Gemini 2.0 Flash Experimental']);
  });

  it('falls back to line parsing when JSON object has no models array', () => {
    // arr is null → names stays [] → line fallback runs on the raw JSON string.
    const raw = JSON.stringify({ other: 'field', count: 5 });
    expect(parseModels(raw)).toEqual([raw]);
  });
});
