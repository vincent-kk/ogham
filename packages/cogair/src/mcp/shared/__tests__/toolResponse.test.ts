import { describe, expect, it } from 'vitest';

import {
  mapReplacer,
  toolError,
  toolResult,
  wrapHandler,
} from '../toolResponse.js';

describe('toolResult', () => {
  it('wraps a value in the MCP content envelope as compact JSON', () => {
    const r = toolResult({ a: 1, b: [2, 3] });
    expect(r.content).toHaveLength(1);
    expect(r.content[0].type).toBe('text');
    expect(JSON.parse(r.content[0].text)).toEqual({ a: 1, b: [2, 3] });
    expect(r.content[0].text).not.toContain('\n');
  });

  it('pretty-prints when COGAIR_PRETTY_JSON=1', () => {
    process.env.COGAIR_PRETTY_JSON = '1';
    try {
      expect(toolResult({ a: 1 }).content[0].text).toContain('\n');
    } finally {
      delete process.env.COGAIR_PRETTY_JSON;
    }
  });
});

describe('toolError', () => {
  it('serializes Error.message and marks isError true', () => {
    const r = toolError(new Error('boom'));
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toBe('Error: boom');
  });

  it('stringifies non-Error values', () => {
    expect(toolError('bad input').content[0].text).toBe('Error: bad input');
  });
});

describe('wrapHandler', () => {
  it('returns toolResult on success', async () => {
    const wrapped = wrapHandler(async (n: number) => ({ doubled: n * 2 }));
    const r = await wrapped(3);
    expect('isError' in r).toBe(false);
    expect(
      JSON.parse((r as { content: { text: string }[] }).content[0].text),
    ).toEqual({
      doubled: 6,
    });
  });

  it('returns toolError when handler throws', async () => {
    const wrapped = wrapHandler(async () => {
      throw new Error('handler failure');
    });
    const r = await wrapped(undefined);
    expect('isError' in r ? r.isError : false).toBe(true);
    expect((r as { content: { text: string }[] }).content[0].text).toContain(
      'handler failure',
    );
  });
});

describe('mapReplacer', () => {
  it('converts Map and Set to JSON-friendly shapes', () => {
    const m = new Map([['a', 1]]);
    const s = new Set([1, 2, 3]);
    expect(JSON.parse(JSON.stringify({ m, s }, mapReplacer))).toEqual({
      m: { a: 1 },
      s: [1, 2, 3],
    });
  });
});
