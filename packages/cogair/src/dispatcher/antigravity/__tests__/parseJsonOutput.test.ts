import { describe, expect, it } from 'vitest';

import { parseJsonOutput } from '../utils/parseJsonOutput.js';

describe('parseJsonOutput', () => {
  it('returns null for empty / whitespace stdout (Issue #76 signal)', () => {
    expect(parseJsonOutput('')).toBeNull();
    expect(parseJsonOutput('   \n')).toBeNull();
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
