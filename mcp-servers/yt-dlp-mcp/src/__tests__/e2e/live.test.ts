import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../../config/index.js';
import { type Service, createService } from '../../core/service.js';
import { listSubtitlesOperation } from '../../features/subtitle/operations/list-subtitles.js';
import { subtitlesOperation } from '../../features/subtitle/operations/subtitles.js';
import { transcriptOperation } from '../../features/subtitle/operations/transcript.js';
import { createLogger } from '../../obs/logger.js';
import { createPaths } from '../../paths/index.js';
import type { BinaryManager } from '../../ytdlp/binary/ensure-binary.js';
import { createBinaryManager } from '../../ytdlp/binary/ensure-binary.js';
import { fetchJson } from '../../ytdlp/binary/http.js';
import { createVersionResolver } from '../../ytdlp/binary/version.js';
import { chaptersOperation } from '../../ytdlp/operations/chapters.js';
import { commentsOperation } from '../../ytdlp/operations/comments.js';
import { downloadOperation } from '../../ytdlp/operations/download.js';
import { heatmapOperation } from '../../ytdlp/operations/heatmap.js';
import { metadataOperation } from '../../ytdlp/operations/metadata.js';
import { playlistOperation } from '../../ytdlp/operations/playlist.js';
import { searchOperation } from '../../ytdlp/operations/search.js';
import { thumbnailOperation } from '../../ytdlp/operations/thumbnail.js';
import { type Runner, createRunner } from '../../ytdlp/runner/runner.js';

// Gated end-to-end harness. These actually download the yt-dlp binary and hit
// YouTube, so they are skipped unless explicitly enabled:
//   RUN_BINARY_TESTS=1    → binary acquisition (download + checksum + --version)
//   RUN_NETWORK_TESTS=1   → live extraction against a real video (read-only)
//   RUN_DOWNLOAD_TESTS=1  → live media downloads (heavy; audio needs ffmpeg)
// Override targets with YTDLP_E2E_URL / YTDLP_E2E_PLAYLIST_URL / YTDLP_E2E_QUERY.
const RUN_BINARY = process.env.RUN_BINARY_TESTS === '1';
const RUN_NETWORK = process.env.RUN_NETWORK_TESTS === '1';
const RUN_DOWNLOAD = process.env.RUN_DOWNLOAD_TESTS === '1';

const TARGET =
  process.env.YTDLP_E2E_URL ?? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const PLAYLIST = process.env.YTDLP_E2E_PLAYLIST_URL;
const QUERY = process.env.YTDLP_E2E_QUERY ?? 'lofi hip hop';
const TIMEOUT = 300_000;

interface Harness {
  home: string;
  binaryManager: BinaryManager;
  runner: Runner;
  service: Service;
}

async function bootstrap(): Promise<Harness> {
  const home = await mkdtemp(path.join(tmpdir(), 'ytmcp-e2e-'));
  const config = loadConfig({ YTDLP_HOME: home });
  const paths = createPaths(config);
  await paths.ensureBaseDirs();
  const logger = createLogger('silent');
  const versionResolver = createVersionResolver({
    config: {
      cooldownDays: config.binary.cooldownDays,
      pinnedVersion: config.binary.pinnedVersion,
    },
    fetchJson,
  });
  const binaryManager = createBinaryManager({
    paths,
    config,
    versionResolver,
    logger,
  });
  const runner = createRunner({ binaryManager, config, logger });
  const service = createService({ runner, config, paths, logger });
  return { home, binaryManager, runner, service };
}

// Shared across a describe block so the binary downloads once, not per test.
let shared: Harness | undefined;
function harness(): Harness {
  if (!shared) throw new Error('e2e harness not bootstrapped');
  return shared;
}

describe.skipIf(!RUN_BINARY)('e2e · binary acquisition', () => {
  beforeAll(async () => {
    shared = await bootstrap();
  }, TIMEOUT);
  afterAll(async () => {
    if (shared) await rm(shared.home, { recursive: true, force: true });
    shared = undefined;
  });

  it(
    'downloads, checksum-verifies, and runs yt-dlp --version',
    async () => {
      const bin = await harness().binaryManager.ensureBinary();
      expect((await stat(bin)).size).toBeGreaterThan(0);
      const { stdout } = await harness().runner.run(['--version']);
      expect(stdout).toMatch(/\d{4}\.\d{2}\.\d{2}/);
    },
    TIMEOUT,
  );
});

describe.skipIf(!RUN_NETWORK)('e2e · read-only extraction', () => {
  beforeAll(async () => {
    shared = await bootstrap();
  }, TIMEOUT);
  afterAll(async () => {
    if (shared) await rm(shared.home, { recursive: true, force: true });
    shared = undefined;
  });

  it(
    'extracts metadata',
    async () => {
      const meta = await harness().service.execute({}, (ctx) =>
        metadataOperation(ctx, { url: TARGET }),
      );
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.videoId.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  it(
    'extracts a transcript',
    async () => {
      const result = await harness().service.execute({}, (ctx) =>
        transcriptOperation(ctx, { url: TARGET, language: 'en' }),
      );
      expect(result.segments.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  it(
    'lists subtitle languages',
    async () => {
      const result = await harness().service.execute({}, (ctx) =>
        listSubtitlesOperation(ctx, { url: TARGET }),
      );
      expect(result.manual.length + result.automatic.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  it(
    'extracts raw subtitles with timing',
    async () => {
      const result = await harness().service.execute({}, (ctx) =>
        subtitlesOperation(ctx, { url: TARGET, language: 'en' }),
      );
      expect(result.segments?.length ?? 0).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  it(
    'extracts comments without error',
    async () => {
      const result = await harness().service.execute({}, (ctx) =>
        commentsOperation(ctx, {
          url: TARGET,
          maxComments: 5,
          sortOrder: 'top',
        }),
      );
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.comments)).toBe(true);
    },
    TIMEOUT,
  );

  it(
    'returns chapters (possibly empty) without error',
    async () => {
      const result = await harness().service.execute({}, (ctx) =>
        chaptersOperation(ctx, { url: TARGET }),
      );
      expect(Array.isArray(result.chapters)).toBe(true);
    },
    TIMEOUT,
  );

  it(
    'returns a heatmap (possibly empty) without error',
    async () => {
      const result = await harness().service.execute({}, (ctx) =>
        heatmapOperation(ctx, { url: TARGET }),
      );
      expect(Array.isArray(result.spans)).toBe(true);
    },
    TIMEOUT,
  );

  it(
    'searches and returns results',
    async () => {
      const result = await harness().service.execute({}, (ctx) =>
        searchOperation(ctx, { query: QUERY, maxResults: 3, offset: 0 }),
      );
      expect(result.items.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  it.skipIf(!PLAYLIST)(
    'enumerates a playlist (set YTDLP_E2E_PLAYLIST_URL)',
    async () => {
      const result = await harness().service.execute({}, (ctx) =>
        playlistOperation(ctx, { url: PLAYLIST ?? '', limit: 5 }),
      );
      expect(result.entries.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );
});

describe.skipIf(!RUN_DOWNLOAD)('e2e · downloads (heavy)', () => {
  beforeAll(async () => {
    shared = await bootstrap();
  }, TIMEOUT);
  afterAll(async () => {
    if (shared) await rm(shared.home, { recursive: true, force: true });
    shared = undefined;
  });

  it(
    'downloads a thumbnail file',
    async () => {
      const result = await harness().service.execute(
        { cacheable: false },
        (ctx) => thumbnailOperation(ctx, { url: TARGET }),
      );
      expect((await stat(result.path)).size).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  it(
    'downloads a low-res video file',
    async () => {
      const result = await harness().service.execute(
        { cacheable: false },
        (ctx) =>
          downloadOperation(ctx, {
            url: TARGET,
            kind: 'video',
            resolution: '480p',
          }),
      );
      expect((await stat(result.path)).size).toBeGreaterThan(0);
    },
    TIMEOUT,
  );
});
