import { describe, expect, it } from 'vitest';

import { wrapHandler } from '../helpers/wrapHandler.js';

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

  // The SDK aborts this signal when the host cancels the request. Dropping it
  // here is what leaves a spawned CLI running with nobody waiting for it.
  it('hands the request signal to the handler', async () => {
    const controller = new AbortController();
    let received: AbortSignal | undefined;
    const wrapped = wrapHandler(async (_n: number, signal?: AbortSignal) => {
      received = signal;
      return {};
    });

    await wrapped(1, { signal: controller.signal });

    expect(received).toBe(controller.signal);
  });

  it('still runs when the caller passes no request context', async () => {
    const wrapped = wrapHandler(async (_n: number, signal?: AbortSignal) => ({
      hasSignal: signal !== undefined,
    }));
    const r = await wrapped(1);
    expect(
      JSON.parse((r as { content: { text: string }[] }).content[0].text),
    ).toEqual({ hasSignal: false });
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
