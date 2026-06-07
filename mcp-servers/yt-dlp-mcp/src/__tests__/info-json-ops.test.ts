import { describe, expect, it } from 'vitest';

import { chaptersOperation } from '../ytdlp/operations/chapters.js';
import { heatmapOperation } from '../ytdlp/operations/heatmap.js';
import { listSubtitlesOperation } from '../ytdlp/operations/list-subtitles.js';
import { metadataOperation } from '../ytdlp/operations/metadata.js';
import { playlistOperation } from '../ytdlp/operations/playlist.js';
import { searchOperation } from '../ytdlp/operations/search.js';
import { makeFakeRunner } from './helpers/fake-runner.js';
import { SAMPLE_URL } from './helpers/fixtures.js';
import { makeOpContext } from './helpers/test-context.js';

async function runWith<T>(info: unknown, fn: (ctx: Parameters<typeof metadataOperation>[0]) => Promise<T>): Promise<T> {
  const { ctx, env } = await makeOpContext(makeFakeRunner({ stdout: JSON.stringify(info) }));
  try {
    return await fn(ctx);
  } finally {
    await env.cleanup();
  }
}

describe('info-json operations', () => {
  it('maps metadata fields', async () => {
    const meta = await runWith(
      { id: 'abc', title: 'T', channel: 'C', view_count: 100, duration: 212, upload_date: '20240115', tags: ['a'] },
      (ctx) => metadataOperation(ctx, { url: SAMPLE_URL }),
    );
    expect(meta).toMatchObject({
      videoId: 'abc',
      title: 'T',
      channel: 'C',
      viewCount: 100,
      durationSec: 212,
      uploadDate: '2024-01-15',
      tags: ['a'],
    });
  });

  it('maps chapters with ms timing', async () => {
    const result = await runWith(
      { id: 'abc', chapters: [{ start_time: 0, end_time: 10, title: 'Intro' }] },
      (ctx) => chaptersOperation(ctx, { url: SAMPLE_URL }),
    );
    expect(result.chapters).toEqual([{ title: 'Intro', startMs: 0, endMs: 10_000 }]);
  });

  it('maps heatmap spans', async () => {
    const result = await runWith(
      { id: 'abc', heatmap: [{ start_time: 0, end_time: 5, value: 0.9 }] },
      (ctx) => heatmapOperation(ctx, { url: SAMPLE_URL }),
    );
    expect(result.spans).toEqual([{ startMs: 0, endMs: 5000, score: 0.9 }]);
  });

  it('maps playlist entries and builds missing URLs', async () => {
    const result = await runWith(
      { id: 'pl', title: 'My List', entries: [{ id: 'v1', title: 'A', url: 'https://youtu.be/v1' }, { id: 'v2', title: 'B' }] },
      (ctx) => playlistOperation(ctx, { url: SAMPLE_URL }),
    );
    expect(result.count).toBe(2);
    expect(result.entries[1].url).toContain('v2');
  });

  it('paginates search results and reports hasMore', async () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({ id: `v${i}`, title: `T${i}` }));
    const result = await runWith({ entries }, (ctx) =>
      searchOperation(ctx, { query: 'q', maxResults: 2, offset: 2 }),
    );
    expect(result.items.map((i) => i.id)).toEqual(['v2', 'v3']);
    expect(result.hasMore).toBe(true);
    expect(result.nextOffset).toBe(4);
  });

  it('separates manual and automatic subtitle tracks', async () => {
    const result = await runWith(
      {
        id: 'abc',
        subtitles: { en: [{ ext: 'vtt', name: 'English' }], ko: [{ ext: 'srv3' }] },
        automatic_captions: { en: [{ ext: 'vtt' }] },
      },
      (ctx) => listSubtitlesOperation(ctx, { url: SAMPLE_URL }),
    );
    expect(result.manual).toHaveLength(2);
    expect(result.automatic).toHaveLength(1);
    expect(result.manual.find((t) => t.language === 'en')?.name).toBe('English');
  });
});
