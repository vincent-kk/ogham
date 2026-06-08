import { readdir } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { transcriptOperation } from '../features/subtitle/operations/transcript.js';

import { makeFakeRunner } from './helpers/fake-runner.js';
import {
  SAMPLE_JSON3,
  SAMPLE_META,
  SAMPLE_URL,
  SAMPLE_VIDEO_ID,
} from './helpers/fixtures.js';
import { makeOpContext } from './helpers/test-context.js';

describe('transcriptOperation', () => {
  it('parses captions + metadata from a fake yt-dlp run', async () => {
    const runner = makeFakeRunner({
      stdout: SAMPLE_META,
      files: { [`${SAMPLE_VIDEO_ID}.en.json3`]: SAMPLE_JSON3 },
    });
    const { ctx, env } = await makeOpContext(runner);
    const result = await transcriptOperation(ctx, {
      url: SAMPLE_URL,
      language: 'en',
    });
    expect(result.videoId).toBe(SAMPLE_VIDEO_ID);
    expect(result.metadata.title).toBe('Test Title');
    expect(result.metadata.durationSec).toBe(212);
    expect(result.metadata.uploadDate).toBe('2024-01-15');
    expect(result.language).toBe('en');
    expect(result.segments).toHaveLength(3);
    expect(result.availableSubs).toEqual(['en']);
    await env.cleanup();
  });

  it('requests only the asked language family without a forced en fallback', async () => {
    const runner = makeFakeRunner({
      stdout: SAMPLE_META,
      files: { [`${SAMPLE_VIDEO_ID}.ko.json3`]: SAMPLE_JSON3 },
    });
    const { ctx, env } = await makeOpContext(runner);
    await transcriptOperation(ctx, { url: SAMPLE_URL, language: 'ko' });
    const args = runner.calls[0];
    expect(args[args.indexOf('--sub-langs') + 1]).toBe('ko,ko-orig');
    await env.cleanup();
  });

  it('throws NO_CAPTIONS when no subtitle files are produced', async () => {
    const { ctx, env } = await makeOpContext(
      makeFakeRunner({ stdout: SAMPLE_META }),
    );
    await expect(
      transcriptOperation(ctx, { url: SAMPLE_URL, language: 'en' }),
    ).rejects.toMatchObject({
      code: 'NO_CAPTIONS',
    });
    await env.cleanup();
  });

  it('rejects invalid URLs before running yt-dlp', async () => {
    const runner = makeFakeRunner();
    const { ctx, env } = await makeOpContext(runner);
    await expect(
      transcriptOperation(ctx, { url: 'not a url', language: 'en' }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    expect(runner.calls).toHaveLength(0);
    await env.cleanup();
  });

  it('warns when the served language differs from the requested one', async () => {
    const runner = makeFakeRunner({
      stdout: SAMPLE_META,
      files: { [`${SAMPLE_VIDEO_ID}.en.json3`]: SAMPLE_JSON3 },
    });
    const { ctx, env } = await makeOpContext(runner);
    const result = await transcriptOperation(ctx, {
      url: SAMPLE_URL,
      language: 'ko',
    });
    expect(result.language).toBe('en');
    expect(result.warnings).toEqual([
      "Requested language 'ko' but served 'en'.",
    ]);
    await env.cleanup();
  });

  it('removes the temp working directory afterward', async () => {
    const runner = makeFakeRunner({
      stdout: SAMPLE_META,
      files: { [`${SAMPLE_VIDEO_ID}.en.json3`]: SAMPLE_JSON3 },
    });
    const { ctx, env } = await makeOpContext(runner);
    await transcriptOperation(ctx, { url: SAMPLE_URL, language: 'en' });
    expect(await readdir(env.paths.tempDir)).toEqual([]);
    await env.cleanup();
  });
});
