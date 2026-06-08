import os from 'node:os';
import path from 'node:path';

import { z } from 'zod';

const LOG_LEVELS = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
] as const;

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
  }),
  enable: z.object({
    subtitles: z.boolean(),
    metadataSummary: z.boolean(),
    comments: z.boolean(),
    chapters: z.boolean(),
    heatmap: z.boolean(),
    thumbnail: z.boolean(),
    download: z.boolean(),
    playlist: z.boolean(),
  }),
  evasion: z.object({
    cookiesFromBrowser: z.string().min(1).optional(),
    cookiesFile: z.string().min(1).optional(),
    proxy: z.string().min(1).optional(),
  }),
  logLevel: z.enum(LOG_LEVELS),
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

function intEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
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
  const flag = (key: string): boolean => enableAll || boolEnv(env[key]);

  const raw = {
    paths: { home, downloadsDir },
    binary: {
      cooldownDays: intEnv(env.YTDLP_COOLDOWN_DAYS, 3),
      refreshDays: intEnv(env.YTDLP_REFRESH_DAYS, 7),
      pinnedVersion: env.YTDLP_PINNED_VERSION?.trim() || undefined,
    },
    extraction: {
      maxConcurrency: intEnv(env.YTDLP_MAX_CONCURRENCY, 2),
      timeoutMs: intEnv(env.YTDLP_TIMEOUT_MS, 90_000),
      characterLimit: intEnv(env.YTDLP_CHARACTER_LIMIT, 25_000),
      maxTranscriptLength: intEnv(env.YTDLP_MAX_TRANSCRIPT_LENGTH, 50_000),
    },
    enable: {
      subtitles: flag('YTDLP_ENABLE_SUBTITLES'),
      metadataSummary: flag('YTDLP_ENABLE_METADATA_SUMMARY'),
      comments: flag('YTDLP_ENABLE_COMMENTS'),
      chapters: flag('YTDLP_ENABLE_CHAPTERS'),
      heatmap: flag('YTDLP_ENABLE_HEATMAP'),
      thumbnail: flag('YTDLP_ENABLE_THUMBNAIL'),
      download: flag('YTDLP_ENABLE_DOWNLOAD'),
      playlist: flag('YTDLP_ENABLE_PLAYLIST'),
    },
    evasion: {
      cookiesFromBrowser: env.YTDLP_COOKIES_FROM_BROWSER?.trim() || undefined,
      cookiesFile: env.YTDLP_COOKIES_FILE?.trim() || undefined,
      proxy: env.YTDLP_PROXY?.trim() || undefined,
    },
    logLevel: env.YTDLP_LOG_LEVEL?.trim() || 'info',
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
