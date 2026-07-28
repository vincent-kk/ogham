import { describe, expect, it } from 'vitest';

import { parseJsonOutput } from '../utils/parseJsonOutput.js';

describe('parseJsonOutput', () => {
  it('returns null for empty / whitespace stdout (Issue #76 signal)', () => {
    expect(parseJsonOutput('')).toBeNull();
    expect(parseJsonOutput('   \n')).toBeNull();
  });

  // A recognised stream with no readable answer is a failure. Falling through to
  // the legacy paths would hand the caller the whole JSONL as if it were prose,
  // and skip the transcript recovery callAgy runs on null.
  it('returns null for a stream whose result carries no response', () => {
    const stream = [
      JSON.stringify({ event: 'init', conversation_id: 'c1' }),
      JSON.stringify({ event: 'step_update', step_update: { state: 'DONE' } }),
      JSON.stringify({
        event: 'result',
        result: { conversation_id: 'c1', status: 'SUCCESS', response: '  ' },
      }),
    ].join('\n');
    expect(parseJsonOutput(stream)).toBeNull();
  });

  // One non-JSON line ahead of the stream — a version notice — must not disable the
  // guard and turn the whole JSONL dump into the answer.
  it('returns null for a recognised stream that a banner line precedes', () => {
    const stream = [
      'Warning: a new version of agy is available',
      JSON.stringify({
        event: 'result',
        result: { status: 'ERROR', error: 'invalid model selection' },
      }),
    ].join('\n');
    expect(parseJsonOutput(stream)).toBeNull();
  });

  it('returns null for a stream that never emits a result event', () => {
    const stream = [
      JSON.stringify({ event: 'init', conversation_id: 'c1' }),
      JSON.stringify({ event: 'step_update', step_update: { state: 'DONE' } }),
    ].join('\n');
    expect(parseJsonOutput(stream)).toBeNull();
  });

  it('extracts the response field from a json object', () => {
    expect(parseJsonOutput(JSON.stringify({ response: 'hello' }))).toBe(
      'hello',
    );
  });

  it('probes alternate answer keys', () => {
    expect(parseJsonOutput(JSON.stringify({ output: 'out' }))).toBe('out');
    expect(parseJsonOutput(JSON.stringify({ text: 'txt' }))).toBe('txt');
    expect(parseJsonOutput(JSON.stringify({ message: 'msg' }))).toBe('msg');
    expect(parseJsonOutput(JSON.stringify({ result: 'res' }))).toBe('res');
  });

  it('returns a bare json string verbatim', () => {
    expect(parseJsonOutput(JSON.stringify('just text'))).toBe('just text');
  });

  it('returns null for a json object with no known answer key', () => {
    expect(
      parseJsonOutput(JSON.stringify({ usage: { tokens: 5 } })),
    ).toBeNull();
  });

  it('returns plain non-json text verbatim (older text mode)', () => {
    expect(parseJsonOutput('plain answer')).toBe('plain answer');
  });

  it('returns null for valid json that is an array or number', () => {
    expect(parseJsonOutput('[]')).toBeNull();
    expect(parseJsonOutput('0')).toBeNull();
  });
});
