import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import which from "which";
import { paths } from "../paths/index.js";
import { spawnCli } from "../spawn/index.js";
import { installHints } from "./installHints.js";
import type { BinaryStatus } from "./types.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface DiscoverOptions {
  timeoutMs?: number;
  pkg?: string;
  cacheFile?: string;
  refresh?: boolean;
}

interface CacheEntry {
  available: boolean;
  path?: string;
  version?: string;
  cachedAt: number;
}

function resolveCacheFile(opts: DiscoverOptions): string {
  if (opts.cacheFile) return opts.cacheFile;
  const pkg = opts.pkg ?? "cross-platform";
  const dir = paths.pluginCache(pkg);
  mkdirSync(dir, { recursive: true });
  return join(dir, "binaries.json");
}

function isCacheShape(v: unknown): v is Record<string, CacheEntry> {
  return typeof v === "object" && v !== null;
}

function readCache(file: string): Record<string, CacheEntry> {
  if (!existsSync(file)) return {};
  try {
    const stats = statSync(file);
    if (Date.now() - stats.mtimeMs > CACHE_TTL_MS) return {};
    const data: unknown = JSON.parse(readFileSync(file, "utf8"));
    return isCacheShape(data) ? data : {};
  } catch {
    return {};
  }
}

function writeCache(file: string, entries: Record<string, CacheEntry>): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(entries, null, 2));
}

export async function discover(
  bin: string,
  opts: DiscoverOptions = {},
): Promise<BinaryStatus> {
  const file = resolveCacheFile(opts);
  const cache = opts.refresh ? {} : readCache(file);
  const cached = cache[bin];
  if (cached) {
    return {
      bin,
      available: cached.available,
      path: cached.path,
      version: cached.version,
      installHint: cached.available ? undefined : installHints(bin),
    };
  }

  const found = await which(bin, { nothrow: true });

  let version: string | undefined;
  if (found) {
    const result = await spawnCli(bin, ["--version"], {
      timeoutMs: opts.timeoutMs ?? 3000,
    });
    if (result.code === 0) {
      const firstLine = result.stdout.trim().split("\n")[0];
      if (firstLine) version = firstLine;
    }
  }

  const status: BinaryStatus = {
    bin,
    available: !!found,
    path: found ?? undefined,
    version,
    installHint: found ? undefined : installHints(bin),
  };

  cache[bin] = {
    available: status.available,
    path: status.path,
    version: status.version,
    cachedAt: Date.now(),
  };
  writeCache(file, cache);

  return status;
}

export const binaries = {
  ensureNode: (opts?: DiscoverOptions) => discover("node", opts),
  ensureGit: (opts?: DiscoverOptions) => discover("git", opts),
  ensure: (bin: string, opts?: DiscoverOptions) => discover(bin, opts),
};
