import { describe, expect, it } from 'vitest';

import { parseResult } from '../utils/parseResult.js';

describe('parseResult', () => {
  it('extracts result text from a success envelope', () => {
    const out = parseResult(
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: 'hello world',
        session_id: 'x',
      }),
    );
    expect(out).toEqual({ response: 'hello world', error: null });
  });

  it('flags an error when is_error is true', () => {
    const out = parseResult(
      JSON.stringify({ type: 'result', is_error: true, result: 'boom' }),
    );
    expect(out.error).toBe('boom');
  });

  it('flags an error when subtype is not success', () => {
    const out = parseResult(
      JSON.stringify({ subtype: 'error_max_turns', result: 'partial' }),
    );
    expect(out.error).not.toBeNull();
    expect(out.response).toBe('partial');
  });

  it('reports empty output', () => {
    expect(parseResult('   ').error).toBe('claude produced no output');
  });

  it('reports non-JSON output', () => {
    expect(parseResult('not json at all').error).toBe(
      'claude output was not valid JSON',
    );
  });

  it('reports an empty result when the success envelope carries no text', () => {
    const out = parseResult(JSON.stringify({ subtype: 'success' }));
    expect(out.response).toBeNull();
    expect(out.error).toBe('claude returned an empty result');
  });
});
