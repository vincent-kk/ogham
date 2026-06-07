import { describe, expect, it } from 'vitest';

import { toolResult } from '../helpers/toolResult.js';

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
