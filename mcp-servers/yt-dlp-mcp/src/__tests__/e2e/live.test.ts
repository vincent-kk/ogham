import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../config.js';
import { createService } from '../../core/service.js';
import { createLogger } from '../../obs/logger.js';
import { createPaths } from '../../paths.js';
import { createBinaryManager } from '../../ytdlp/ensure-binary.js';
import { fetchJson } from '../../ytdlp/http.js';
import { metadataOperation } from '../../ytdlp/operations/metadata.js';
import { transcriptOperation } from '../../ytdlp/operations/transcript.js';
import { createRunner } from '../../ytdlp/runner.js';
import { createVersionResolver } from '../../ytdlp/version.js';

// Gated end-to-end harness. These actually download the yt-dlp binary and hit
// YouTube, so they are skipped unless explicitly enabled:
//   RUN_BINARY_TESTS=1   → binary acquisition (download + checksum + --version)
//   RUN_NETWORK_TESTS=1  → live extraction against a real video
// Override the target with YTDLP_E2E_URL. See README "Testing".
const RUN_BINARY = process.env.RUN_BINARY_TESTS === '1';
const RUN_NETWORK = process.env.RUN_NETWORK_TESTS === '1';
const TARGET = process.env.YTDLP_E2E_URL ?? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const TIMEOUT = 300_000;

async function bootstrap() {
  const home = await mkdtemp(path.join(tmpdir(), 'ytmcp-e2e-'));
  const config = loadConfig({ YTDLP_HOME: home });
  const paths = createPaths(config);
  await paths.ensureBaseDirs();
  const logger = createLogger('silent');
  const versionResolver = createVersionResolver({
    config: { cooldownDays: config.binary.cooldownDays, pinnedVersion: config.binary.pinnedVersion },
    fetchJson,
  });
  const binaryManager = createBinaryManager({ paths, config, versionResolver, logger });
  const runner = createRunner({ binaryManager, config, logger });
  const service = createService({ runner, config, paths, logger });
  return { home, binaryManager, runner, service };
}

describe.skipIf(!RUN_BINARY)('e2e · binary acquisition', () => {
  it(
    'downloads, checksum-verifies, and runs yt-dlp --version',
    async () => {
      const { home, binaryManager, runner } = await bootstrap();
      try {
        const bin = await binaryManager.ensureBinary();
        expect((await stat(bin)).size).toBeGreaterThan(0);
        const { stdout } = await runner.run(['--version']);
        expect(stdout).toMatch(/\d{4}\.\d{2}\.\d{2}/);
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );
});

describe.skipIf(!RUN_NETWORK)('e2e · live extraction', () => {
  it(
    'extracts metadata for a known video',
    async () => {
      const { home, service } = await bootstrap();
      try {
        const meta = await service.execute({}, (ctx) => metadataOperation(ctx, { url: TARGET }));
        expect(meta.title.length).toBeGreaterThan(0);
        expect(meta.videoId.length).toBeGreaterThan(0);
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );

  it(
    'extracts a transcript for a known video',
    async () => {
      const { home, service } = await bootstrap();
      try {
        const result = await service.execute({}, (ctx) =>
          transcriptOperation(ctx, { url: TARGET, language: 'en' }),
        );
        expect(result.segments.length).toBeGreaterThan(0);
        expect(result.metadata.title.length).toBeGreaterThan(0);
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );
});
