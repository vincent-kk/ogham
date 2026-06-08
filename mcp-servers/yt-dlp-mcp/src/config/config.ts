import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

import {
  type EnableKey,
  TOOL_DEFAULT_ENABLED,
} from '@/constants/tool-defaults.js';

const LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
] as const;

const enableShape = Object.fromEntries(
  (Object.keys(TOOL_DEFAULT_ENABLED) as EnableKey[]).map((key) => [
    key,
    z.boolean(),
  ]),
) as Record<EnableKey, z.ZodBoolean>;

const ConfigSchema = z.object({
  paths: z.object({
    home: z.string().min(1),
    downloadsDir: z.string().min(1),
  }),
  binary: z.object({
    cooldownDays: z.number().int().min(0),
    refreshDays: z.number().int().min(0),
    pinnedVersion: z.string().min(1).optional(),
  }),
  extraction: z.object({
    maxConcurrency: z.number().int().min(1).max(16),
    timeoutMs: z.number().int().min(1000),
    characterLimit: z.number().int().min(100),
    maxTranscriptLength: z.number().int().min(100),
    requestIntervalMs: z.number().int().min(0),
    subtitleIntervalMs: z.number().int().min(0),
    defaultSubLang: z.string().min(1),
  }),
  enable: z.object(enableShape),
  evasion: z.object({
    cookiesFromBrowser: z.string().min(1).optional(),
    cookiesFile: z.string().min(1).optional(),
    proxy: z.string().min(1).optional(),
    proxyPool: z.array(z.string().min(1)),
  }),
  logLevel: z.enum(LOG_LEVELS),
  lang: z.string().min(1).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
export type EnableFlags = Config['enable'];

type Env = Record<string, string | undefined>;

function expandHome(p: string): string {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\'))
    return path.join(os.homedir(), p.slice(2));
  return p;
}

function boolEnv(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** Tri-state: unset/empty → fallback (the tool's default); set → parsed boolean. */
function flagEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return boolEnv(value);
}

function enableEnvName(key: EnableKey): string {
  const suffix = key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase();
  return `YTDLP_ENABLE_${suffix}`;
}

function intEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function listEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

interface AdaptiveDefaults {
  maxConcurrency: number;
  requestIntervalMs: number;
  subtitleIntervalMs: number;
}

/**
 * Derives expected rate-limit defaults from proxy state (PLAN §D).
 * Precedence: non-empty pool > single proxy > none. Each value is a
 * fallback passed to `intEnv`, so explicit env vars still override.
 */
function adaptiveDefaults(
  proxyPool: string[],
  proxy: string | undefined,
): AdaptiveDefaults {
  if (proxyPool.length > 0)
    return {
      maxConcurrency: Math.min(proxyPool.length, 8),
      requestIntervalMs: 0,
      subtitleIntervalMs: 250,
    };
  if (proxy)
    return {
      maxConcurrency: 2,
      requestIntervalMs: 750,
      subtitleIntervalMs: 2000,
    };
  return {
    maxConcurrency: 1,
    requestIntervalMs: 1500,
    subtitleIntervalMs: 4000,
  };
}

/**
 * Loads and validates configuration from environment variables (PLAN §6-4).
 * Throws on invalid values rather than silently falling back.
 */
export function loadConfig(env: Env = process.env): Config {
  const home = expandHome(
    env.YTDLP_HOME?.trim() || path.join(os.homedir(), '.yt-dlp'),
  );
  const downloadsDir = expandHome(
    env.YTDLP_DOWNLOADS_DIR?.trim() || path.join(home, 'downloads'),
  );
  const enableAll = boolEnv(env.YTDLP_ENABLE_ALL);
  const enable = Object.fromEntries(
    (Object.keys(TOOL_DEFAULT_ENABLED) as EnableKey[]).map((key) => [
      key,
      enableAll || flagEnv(env[enableEnvName(key)], TOOL_DEFAULT_ENABLED[key]),
    ]),
  ) as Record<EnableKey, boolean>;

  const proxyPool = listEnv(env.YTDLP_PROXY_POOL);
  const proxy = env.YTDLP_PROXY?.trim() || undefined;
  const adaptive = adaptiveDefaults(proxyPool, proxy);

  const raw = {
    paths: { home, downloadsDir },
    binary: {
      cooldownDays: intEnv(env.YTDLP_COOLDOWN_DAYS, 3),
      refreshDays: intEnv(env.YTDLP_REFRESH_DAYS, 7),
      pinnedVersion: env.YTDLP_PINNED_VERSION?.trim() || undefined,
    },
    extraction: {
      maxConcurrency: intEnv(
        env.YTDLP_MAX_CONCURRENCY,
        adaptive.maxConcurrency,
      ),
      timeoutMs: intEnv(env.YTDLP_TIMEOUT_MS, 90_000),
      characterLimit: intEnv(env.YTDLP_CHARACTER_LIMIT, 25_000),
      maxTranscriptLength: intEnv(env.YTDLP_MAX_TRANSCRIPT_LENGTH, 50_000),
      requestIntervalMs: intEnv(
        env.YTDLP_REQUEST_INTERVAL_MS,
        adaptive.requestIntervalMs,
      ),
      subtitleIntervalMs: intEnv(
        env.YTDLP_SUBTITLE_INTERVAL_MS,
        adaptive.subtitleIntervalMs,
      ),
      defaultSubLang:
        env.YTDLP_DEFAULT_SUB_LANG?.trim() || env.YTDLP_LANG?.trim() || 'en',
    },
    enable,
    evasion: {
      cookiesFromBrowser: env.YTDLP_COOKIES_FROM_BROWSER?.trim() || undefined,
      cookiesFile: env.YTDLP_COOKIES_FILE?.trim() || undefined,
      proxy,
      proxyPool,
    },
    logLevel: env.YTDLP_LOG_LEVEL?.trim() || 'info',
    lang: env.YTDLP_LANG?.trim() || undefined,
  };

  const parsed = ConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid yt-dlp-mcp configuration: ${issues}`);
  }
  return parsed.data;
}
