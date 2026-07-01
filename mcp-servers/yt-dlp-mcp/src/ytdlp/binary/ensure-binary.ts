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

interface BinaryContext {
  paths: Paths;
  config: Config;
  versionResolver: VersionResolver;
  logger: Logger;
  download: (
    url: string,
    destPath: string,
    signal?: AbortSignal,
  ) => Promise<void>;
  getText: (url: string, signal?: AbortSignal) => Promise<string>;
  now: () => number;
  assetName: string;
}

const DAY_MS = 86_400_000;
const LOCK_STALE_MS = 5 * 60_000;
const LOCK_POLL_MS = 250;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fileExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function readMeta(ctx: BinaryContext): Promise<BinaryMeta | null> {
  try {
    const meta = JSON.parse(
      await readFile(ctx.paths.metaPath, 'utf8'),
    ) as BinaryMeta;
    return typeof meta.tag === 'string' && typeof meta.downloadedAt === 'number'
      ? meta
      : null;
  } catch {
    return null;
  }
}

async function isFresh(
  ctx: BinaryContext,
  meta: BinaryMeta | null,
): Promise<boolean> {
  if (!(await fileExists(ctx.paths.binaryPath))) return false;
  if (ctx.config.binary.pinnedVersion)
    return meta?.tag === ctx.config.binary.pinnedVersion;
  if (!meta) return false;
  return ctx.now() - meta.downloadedAt < ctx.config.binary.refreshDays * DAY_MS;
}

async function acquireLock(
  ctx: BinaryContext,
  signal?: AbortSignal,
): Promise<void> {
  const deadline = ctx.now() + LOCK_STALE_MS * 2;
  for (;;) {
    signal?.throwIfAborted();
    try {
      await mkdir(ctx.paths.lockPath);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    try {
      const info = await stat(ctx.paths.lockPath);
      if (ctx.now() - info.mtimeMs > LOCK_STALE_MS) {
        await rm(ctx.paths.lockPath, { recursive: true, force: true });
        continue;
      }
    } catch {
      continue;
    }
    if (ctx.now() > deadline)
      throw new YtDlpMcpError(
        ErrorCode.DOWNLOAD_FAILED,
        'Timed out waiting for binary download lock',
      );

    signal?.throwIfAborted?.();
    await delay(LOCK_POLL_MS);
  }
}

async function releaseLock(ctx: BinaryContext): Promise<void> {
  await rm(ctx.paths.lockPath, { recursive: true, force: true }).catch(
    () => undefined,
  );
}

async function verifyChecksum(
  ctx: BinaryContext,
  filePath: string,
  sumsText: string,
): Promise<void> {
  const expected = parseSums(sumsText, ctx.assetName);
  if (!expected)
    throw new YtDlpMcpError(
      ErrorCode.CHECKSUM_MISMATCH,
      `No checksum entry for ${ctx.assetName}`,
    );
  const actual = await sha256File(filePath);
  if (actual.toLowerCase() !== expected.toLowerCase())
    throw new YtDlpMcpError(
      ErrorCode.CHECKSUM_MISMATCH,
      `Checksum mismatch for ${ctx.assetName}: expected ${expected}, got ${actual}`,
    );
}

async function acquireAndInstall(
  ctx: BinaryContext,
  signal?: AbortSignal,
): Promise<string> {
  const { paths, versionResolver, logger, download, getText, now, assetName } =
    ctx;
  await mkdir(paths.binDir, { recursive: true });
  await acquireLock(ctx, signal);
  // Per-attempt unique staging file: even if the cross-process lock is wrongly
  // reclaimed (stale-mtime TOCTOU), two installers never share/clobber one
  // .part, so verified bytes can't be overwritten before the atomic rename.
  const partPath = `${paths.binaryPath}.${randomUUID()}.part`;
  try {
    if (await isFresh(ctx, await readMeta(ctx))) return paths.binaryPath;
    const resolved = await versionResolver.resolveSafeVersion(signal);
    await rm(partPath, { force: true });
    logger.info({ tag: resolved.tag, asset: assetName }, 'downloading yt-dlp');
    await download(resolved.assetUrl, partPath, signal);
    const sumsText = await getText(resolved.sumsUrl, signal);
    await verifyChecksum(ctx, partPath, sumsText);
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
    await releaseLock(ctx);
  }
}

/**
 * Acquires and caches the yt-dlp binary (ADR-2/4): cooldown version selection,
 * checksum verification, atomic install, cross-process lock, in-process dedupe,
 * and TTL freshness.
 */
export function createBinaryManager(deps: BinaryManagerDeps): BinaryManager {
  const ctx: BinaryContext = {
    paths: deps.paths,
    config: deps.config,
    versionResolver: deps.versionResolver,
    logger: deps.logger,
    download: deps.download ?? downloadToFile,
    getText: deps.fetchText ?? fetchText,
    now: deps.now ?? Date.now,
    assetName: assetNameForPlatform(),
  };
  let inflight: Promise<string> | null = null;

  return {
    async ensureBinary(signal): Promise<string> {
      if (await isFresh(ctx, await readMeta(ctx))) return ctx.paths.binaryPath;
      if (inflight) return inflight;
      inflight = acquireAndInstall(ctx, signal).finally(() => {
        inflight = null;
      });
      return inflight;
    },
  };
}
