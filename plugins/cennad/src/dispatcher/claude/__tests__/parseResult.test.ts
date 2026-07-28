import { describe, expect, it } from 'vitest';

import { parseResult } from '../utils/parseResult.js';

// Shape of a real `claude -p --output-format stream-json --verbose` run: progress
// events first, the result event last.
function stream(...events: unknown[]): string {
  return events.map((event) => JSON.stringify(event)).join('\n');
}

const INIT = { type: 'system', subtype: 'init', session_id: 'x' };
const THINKING = { type: 'system', subtype: 'thinking_tokens' };

describe('parseResult', () => {
  it('extracts result text from the result event of a stream', () => {
    const out = parseResult(
      stream(INIT, THINKING, {
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: 'hello world',
        session_id: 'x',
      }),
    );
    expect(out).toEqual({ response: 'hello world', error: null });
  });

  it('flags an error when is_error is true', () => {
    const out = parseResult(
      stream(INIT, { type: 'result', is_error: true, result: 'boom' }),
    );
    expect(out.error).toBe('boom');
  });

  it('flags an error when subtype is not success', () => {
    const out = parseResult(
      stream({
        type: 'result',
        subtype: 'error_max_turns',
        result: 'partial',
      }),
    );
    expect(out.error).not.toBeNull();
    expect(out.response).toBe('partial');
  });

  it('reports empty output', () => {
    expect(parseResult('   ').error).toBe('claude produced no output');
  });

  it('reports a stream that carries progress but never a result event', () => {
    expect(parseResult(stream(INIT, THINKING)).error).toBe(
      'claude stream ended without a result event',
    );
  });

  it('reports non-JSONL output as a missing result event', () => {
    expect(parseResult('not json at all').error).toBe(
      'claude stream ended without a result event',
    );
  });

  it('reports an empty result when the success envelope carries no text', () => {
    const out = parseResult(stream({ type: 'result', subtype: 'success' }));
    expect(out.response).toBeNull();
    expect(out.error).toBe('claude returned an empty result');
  });

  it('takes the last result event when a stream carries more than one', () => {
    const out = parseResult(
      stream(
        { type: 'result', subtype: 'success', result: 'first' },
        { type: 'result', subtype: 'success', result: 'last' },
      ),
    );
    expect(out.response).toBe('last');
  });
});
