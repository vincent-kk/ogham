import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { toolResult } from '../../../mcp/server/toolResult.js';

describe('toolResult — compact JSON output', () => {
  const original = process.env.FILID_PRETTY_JSON;

  beforeEach(() => {
    delete process.env.FILID_PRETTY_JSON;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.FILID_PRETTY_JSON;
    else process.env.FILID_PRETTY_JSON = original;
  });

  it('should emit JSON without indentation by default', () => {
    const r = toolResult({ a: 1, b: { c: 2 } });
    expect(r.content[0].text).toBe('{"a":1,"b":{"c":2}}');
  });

  it('should still convert Map → object via mapReplacer', () => {
    const r = toolResult({ m: new Map([['k', 'v']]) });
    expect(r.content[0].text).toBe('{"m":{"k":"v"}}');
  });

  it('should opt back into 2-space indent when FILID_PRETTY_JSON=1', () => {
    process.env.FILID_PRETTY_JSON = '1';
    const r = toolResult({ a: 1 });
    expect(r.content[0].text).toContain('\n');
    expect(r.content[0].text).toContain('  "a": 1');
  });
});
