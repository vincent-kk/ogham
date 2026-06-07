import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assetNameForPlatform } from '../ytdlp/asset-name.js';
import { createBinaryManager } from '../ytdlp/ensure-binary.js';
import type { VersionResolver } from '../ytdlp/version.js';
import { makeTestEnv, silentLogger, type TestEnv } from './helpers/test-context.js';

const ASSET = assetNameForPlatform();
const BYTES = Buffer.from('fake-yt-dlp-binary');
const GOOD_HASH = createHash('sha256').update(BYTES).digest('hex');

const resolver: VersionResolver = {
  resolveSafeVersion: async () => ({
    tag: '2025.01.01',
    assetUrl: 'https://dl/asset',
    sumsUrl: 'https://dl/sums',
  }),
};

let env: TestEnv;
beforeEach(async () => {
  env = await makeTestEnv();
});
afterEach(async () => {
  await env.cleanup();
});

describe('createBinaryManager', () => {
  it('downloads, verifies, and installs once for concurrent callers', async () => {
    const download = vi.fn(async (_url: string, dest: string) => {
      await writeFile(dest, BYTES);
    });
    const fetchText = vi.fn(async () => `${GOOD_HASH}  ${ASSET}\n`);
    const bm = createBinaryManager({
      paths: env.paths,
      config: env.config,
      versionResolver: resolver,
      logger: silentLogger,
      download,
      fetchText,
      now: () => 1000,
    });

    const [a, b] = await Promise.all([bm.ensureBinary(), bm.ensureBinary()]);
    expect(a).toBe(env.paths.binaryPath);
    expect(b).toBe(env.paths.binaryPath);
    expect(download).toHaveBeenCalledTimes(1);
    const meta = JSON.parse(await readFile(env.paths.metaPath, 'utf8')) as { tag: string };
    expect(meta.tag).toBe('2025.01.01');
  });

  it('rejects on checksum mismatch and leaves no binary', async () => {
    const download = vi.fn(async (_url: string, dest: string) => {
      await writeFile(dest, BYTES);
    });
    const fetchText = vi.fn(async () => `${'0'.repeat(64)}  ${ASSET}\n`);
    const bm = createBinaryManager({
      paths: env.paths,
      config: env.config,
      versionResolver: resolver,
      logger: silentLogger,
      download,
      fetchText,
      now: () => 1000,
    });
    await expect(bm.ensureBinary()).rejects.toMatchObject({ code: 'CHECKSUM_MISMATCH' });
    await expect(stat(env.paths.binaryPath)).rejects.toThrow();
  });

  it('skips download when a fresh binary is cached', async () => {
    await writeFile(env.paths.binaryPath, BYTES);
    await writeFile(env.paths.metaPath, JSON.stringify({ tag: '2025.01.01', downloadedAt: 1000 }));
    const download = vi.fn();
    const bm = createBinaryManager({
      paths: env.paths,
      config: env.config,
      versionResolver: resolver,
      logger: silentLogger,
      download,
      fetchText: vi.fn(),
      now: () => 2000,
    });
    expect(await bm.ensureBinary()).toBe(env.paths.binaryPath);
    expect(download).not.toHaveBeenCalled();
  });

  it('re-downloads when the cache is older than the refresh window', async () => {
    await writeFile(env.paths.binaryPath, BYTES);
    await writeFile(env.paths.metaPath, JSON.stringify({ tag: 'old', downloadedAt: 0 }));
    const download = vi.fn(async (_url: string, dest: string) => {
      await writeFile(dest, BYTES);
    });
    const fetchText = vi.fn(async () => `${GOOD_HASH}  ${ASSET}\n`);
    const refreshMs = env.config.binary.refreshDays * 86_400_000;
    const bm = createBinaryManager({
      paths: env.paths,
      config: env.config,
      versionResolver: resolver,
      logger: silentLogger,
      download,
      fetchText,
      now: () => refreshMs + 1,
    });
    await bm.ensureBinary();
    expect(download).toHaveBeenCalledTimes(1);
  });
});
