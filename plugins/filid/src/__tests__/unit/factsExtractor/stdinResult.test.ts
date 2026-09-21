import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { readStdinResult } from '../../../lib/stdin.js';

describe('reading a list from standard input tells a timeout from the end of input', () => {
  it('reports the text read so far as incomplete when the input never ends', async () => {
    const input = new PassThrough();
    input.write('a.ts\n');
    expect(await readStdinResult(50, input)).toEqual({
      text: 'a.ts\n',
      complete: false,
    });
  });

  it('reports the whole text as complete when the input ends', async () => {
    const input = new PassThrough();
    input.end('a.ts\nb.ts\n');
    expect(await readStdinResult(1000, input)).toEqual({
      text: 'a.ts\nb.ts\n',
      complete: true,
    });
  });
});
