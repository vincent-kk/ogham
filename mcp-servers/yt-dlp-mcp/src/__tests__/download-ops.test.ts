import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { OpContext } from '../ytdlp/operations/context.js';
import { downloadOperation } from '../ytdlp/operations/download.js';
import { subtitlesOperation } from '../ytdlp/operations/subtitles.js';
import { thumbnailOperation } from '../ytdlp/operations/thumbnail.js';

import { makeFakeRunner } from './helpers/fake-runner.js';
import { SAMPLE_JSON3, SAMPLE_URL } from './helpers/fixtures.js';
import {
  type TestEnv,
  makeTestEnv,
  silentLogger,
} from './helpers/test-context.js';

let env: TestEnv;
beforeEach(async () => {
  env = await makeTestEnv();
});
afterEach(async () => {
  await env.cleanup();
});

function ctxWith(
  runner: Parameters<typeof downloadOperation>[0]['runner'],
): OpContext {
  return { runner, config: env.config, paths: env.paths, logger: silentLogger };
}

describe('download/thumbnail/subtitles operations', () => {
  it('returns the moved file path and size for downloads', async () => {
    const filePath = path.join(env.paths.downloadsDir, 'video.mp4');
    const runner = makeFakeRunner({
      stdout: filePath,
      files: { 'video.mp4': 'binarydata' },
    });
    const result = await downloadOperation(ctxWith(runner), {
      url: SAMPLE_URL,
      kind: 'video',
    });
    expect(result.path).toBe(filePath);
    expect(result.format).toBe('mp4');
    expect(result.bytes).toBe('binarydata'.length);
  });

  it('passes audio extraction flags', async () => {
    const filePath = path.join(env.paths.downloadsDir, 'audio.m4a');
    const runner = makeFakeRunner({
      stdout: filePath,
      files: { 'audio.m4a': 'aaa' },
    });
    await downloadOperation(ctxWith(runner), {
      url: SAMPLE_URL,
      kind: 'audio',
    });
    expect(runner.calls[0]).toContain('-x');
    expect(runner.calls[0]).toContain('--audio-format');
  });

  it('detects the new thumbnail file', async () => {
    const runner = makeFakeRunner({ files: { 'abc.jpg': 'imgdata' } });
    const result = await thumbnailOperation(ctxWith(runner), {
      url: SAMPLE_URL,
    });
    expect(result.path).toBe(path.join(env.paths.downloadsDir, 'abc.jpg'));
    expect(result.bytes).toBe('imgdata'.length);
  });

  it('returns raw subtitle content + parsed segments', async () => {
    const runner = makeFakeRunner({
      stdout: 'abc',
      files: { 'abc.en.json3': SAMPLE_JSON3 },
    });
    const ctx: OpContext = {
      runner,
      config: env.config,
      paths: env.paths,
      logger: silentLogger,
    };
    const result = await subtitlesOperation(ctx, {
      url: SAMPLE_URL,
      language: 'en',
    });
    expect(result.videoId).toBe('abc');
    expect(result.format).toBe('json3');
    expect(result.segments).toHaveLength(3);
    expect(result.content).toContain('events');
  });
});
