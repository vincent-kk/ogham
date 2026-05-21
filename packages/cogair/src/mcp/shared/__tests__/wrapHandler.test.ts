import { describe, expect, it } from 'vitest';

import { wrapHandler } from '../wrapHandler.js';

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
