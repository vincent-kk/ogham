import { randomUUID } from 'node:crypto';
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';

import type { Config } from '@/config/index.js';
import { ErrorCode, YtDlpMcpError } from '@/domain/errors.js';
import type { Logger } from '@/obs/logger.js';
import type { Paths } from '@/paths/index.js';

import { assetNameForPlatform } from './asset-name.js';
import { parseSums, sha256File } from './checksum.js';
import { downloadToFile, fetchText } from './http.js';
import type { VersionResolver } from './version.js';

export interface BinaryManager {
  ensureBinary(signal?: AbortSignal): Promise<string>;
}

interface BinaryMeta {
  tag: string;
  downloadedAt: number;
}

export interface BinaryManagerDeps {
  paths: Paths;
  config: Config;
  versionResolver: VersionResolver;
  logger: Logger;
  download?: (
    url: string,
    destPath: string,
    signal?: AbortSignal,
  ) => Promise<void>;
  fetchText?: (url: string, signal?: AbortSignal) => Promise<string>;
  now?: () => number;
}

const DAY_MS = 86_400_000;
const LOCK_STALE_MS = 5 * 60_000;
const LOCK_POLL_MS = 250;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Acquires and caches the yt-dlp binary (ADR-2/4): cooldown version selection,
 * checksum verification, atomic install, cross-process lock, in-process dedupe,
 * and TTL freshness.
 */
export function createBinaryManager(deps: BinaryManagerDeps): BinaryManager {
  const { paths, config, versionResolver, logger } = deps;
  const download = deps.download ?? downloadToFile;
  const getText = deps.fetchText ?? fetchText;
  const now = deps.now ?? Date.now;
  const assetName = assetNameForPlatform();
  let inflight: Promise<string> | null = null;

  async function fileExists(p: string): Promise<boolean> {
    try {
      await stat(p);
      return true;
    } catch {
      return false;
    }
  }

  async function readMeta(): Promise<BinaryMeta | null> {
    try {
      const meta = JSON.parse(
        await readFile(paths.metaPath, 'utf8'),
      ) as BinaryMeta;
      return typeof meta.tag === 'string' &&
        typeof meta.downloadedAt === 'number'
        ? meta
        : null;
    } catch {
      return null;
    }
  }

  async function isFresh(meta: BinaryMeta | null): Promise<boolean> {
    if (!(await fileExists(paths.binaryPath))) return false;
    if (config.binary.pinnedVersion)
      return meta?.tag === config.binary.pinnedVersion;
    if (!meta) return false;
    return now() - meta.downloadedAt < config.binary.refreshDays * DAY_MS;
  }

  async function acquireLock(signal?: AbortSignal): Promise<void> {
    const deadline = now() + LOCK_STALE_MS * 2;
    for (;;) {
      signal?.throwIfAborted();
      try {
        await mkdir(paths.lockPath);
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
      try {
        const info = await stat(paths.lockPath);
        if (now() - info.mtimeMs > LOCK_STALE_MS) {
          await rm(paths.lockPath, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (now() > deadline) {
        throw new YtDlpMcpError(
          ErrorCode.DOWNLOAD_FAILED,
          'Timed out waiting for binary download lock',
        );
      }
      signal?.throwIfAborted?.();
      await delay(LOCK_POLL_MS);
    }
  }

  async function releaseLock(): Promise<void> {
    await rm(paths.lockPath, { recursive: true, force: true }).catch(
      () => undefined,
    );
  }

  async function verifyChecksum(
    filePath: string,
    sumsText: string,
  ): Promise<void> {
    const expected = parseSums(sumsText, assetName);
    if (!expected)
      throw new YtDlpMcpError(
        ErrorCode.CHECKSUM_MISMATCH,
        `No checksum entry for ${assetName}`,
      );
    const actual = await sha256File(filePath);
    if (actual.toLowerCase() !== expected.toLowerCase()) {
      throw new YtDlpMcpError(
        ErrorCode.CHECKSUM_MISMATCH,
        `Checksum mismatch for ${assetName}: expected ${expected}, got ${actual}`,
      );
    }
  }

  async function acquireAndInstall(signal?: AbortSignal): Promise<string> {
    await mkdir(paths.binDir, { recursive: true });
    await acquireLock(signal);
    // Per-attempt unique staging file: even if the cross-process lock is wrongly
    // reclaimed (stale-mtime TOCTOU), two installers never share/clobber one
    // .part, so verified bytes can't be overwritten before the atomic rename.
    const partPath = `${paths.binaryPath}.${randomUUID()}.part`;
    try {
      if (await isFresh(await readMeta())) return paths.binaryPath;
      const resolved = await versionResolver.resolveSafeVersion(signal);
      await rm(partPath, { force: true });
      logger.info(
        { tag: resolved.tag, asset: assetName },
        'downloading yt-dlp',
      );
      await download(resolved.assetUrl, partPath, signal);
      const sumsText = await getText(resolved.sumsUrl, signal);
      await verifyChecksum(partPath, sumsText);
      if (process.platform !== 'win32') await chmod(partPath, 0o755);
      await rename(partPath, paths.binaryPath);
      const meta: BinaryMeta = { tag: resolved.tag, downloadedAt: now() };
      await writeFile(paths.metaPath, JSON.stringify(meta), 'utf8');
      logger.info({ tag: resolved.tag }, 'yt-dlp ready');
      return paths.binaryPath;
    } catch (error) {
      await rm(partPath, { force: true }).catch(() => undefined);
      throw error;
    } finally {
      await releaseLock();
    }
  }

  return {
    async ensureBinary(signal): Promise<string> {
      if (await isFresh(await readMeta())) return paths.binaryPath;
      if (inflight) return inflight;
      inflight = acquireAndInstall(signal).finally(() => {
        inflight = null;
      });
      return inflight;
    },
  };
}
