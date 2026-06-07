import { describe, expect, it } from 'vitest';

import { searchOperation } from '../ytdlp/operations/search.js';

import { makeFakeRunner } from './helpers/fake-runner.js';
import { makeOpContext } from './helpers/test-context.js';

const entries = JSON.stringify({
  entries: [{ id: 'v0', title: 'T0', upload_date: '20240101' }],
});

describe('searchOperation argument contract', () => {
  it('stays flat (fast) with no date filter', async () => {
    const runner = makeFakeRunner({ stdout: entries });
    const { ctx, env } = await makeOpContext(runner);
    await searchOperation(ctx, { query: 'q', maxResults: 1, offset: 0 });
    expect(runner.calls[0]).toContain('--flat-playlist');
    expect(runner.calls[0]).not.toContain('--dateafter');
    await env.cleanup();
  });

  it('drops --flat-playlist and adds --dateafter when a date filter is set', async () => {
    const runner = makeFakeRunner({ stdout: entries });
    const { ctx, env } = await makeOpContext(runner);
    await searchOperation(ctx, {
      query: 'q',
      maxResults: 1,
      offset: 0,
      uploadDateFilter: 'week',
    });
    expect(runner.calls[0]).not.toContain('--flat-playlist');
    expect(runner.calls[0]).toContain('--dateafter');
    await env.cleanup();
  });
});
