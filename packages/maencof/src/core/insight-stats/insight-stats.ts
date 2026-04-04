import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import {
  DEFAULT_INSIGHT_CONFIG,
  DEFAULT_INSIGHT_STATS,
  type InsightConfig,
  InsightConfigSchema,
  type InsightStats,
  type PendingInsightCapture,
  type PendingInsightNotification,
} from '../../types/insight.js';

const MAENCOF_META_DIR = '.maencof-meta';

function metaPath(cwd: string, ...segments: string[]): string {
  return join(cwd, MAENCOF_META_DIR, ...segments);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ─── Config ─────────────────────────────────────────────────────────

export function readInsightConfig(cwd: string): InsightConfig {
  const configPath = metaPath(cwd, 'insight-config.json');
  if (!existsSync(configPath)) return DEFAULT_INSIGHT_CONFIG;
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const result = InsightConfigSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : DEFAULT_INSIGHT_CONFIG;
  } catch {
    return DEFAULT_INSIGHT_CONFIG;
  }
}

export function writeInsightConfig(cwd: string, config: InsightConfig): void {
  const configPath = metaPath(cwd, 'insight-config.json');
  ensureDir(configPath);
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

// ─── Stats ──────────────────────────────────────────────────────────

export function readInsightStats(cwd: string): InsightStats {
  const statsPath = metaPath(cwd, 'auto-insight-stats.json');
  if (!existsSync(statsPath)) return { ...DEFAULT_INSIGHT_STATS };
  try {
    return JSON.parse(readFileSync(statsPath, 'utf-8')) as InsightStats;
  } catch {
    return { ...DEFAULT_INSIGHT_STATS };
  }
}

export function incrementInsightStats(cwd: string, layer: 2 | 5): void {
  const stats = readInsightStats(cwd);
  stats.total_captured += 1;
  if (layer === 2) stats.l2_direct += 1;
  else stats.l5_captured += 1;
  stats.updatedAt = new Date().toISOString();

  const statsPath = metaPath(cwd, 'auto-insight-stats.json');
  ensureDir(statsPath);
  writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
}

// ─── Pending Notification ───────────────────────────────────────────

const PENDING_FILE = 'pending-insight-notification.json';

export function readPendingNotification(
  cwd: string,
): PendingInsightNotification | null {
  const filePath = metaPath(cwd, PENDING_FILE);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(
      readFileSync(filePath, 'utf-8'),
    ) as PendingInsightNotification;
  } catch {
    return null;
  }
}

export function appendPendingCapture(
  cwd: string,
  capture: PendingInsightCapture,
  sessionId: string,
): void {
  const filePath = metaPath(cwd, PENDING_FILE);
  ensureDir(filePath);

  const existing = readPendingNotification(cwd);
  const notification: PendingInsightNotification = existing ?? {
    captures: [],
    sessionId,
    createdAt: new Date().toISOString(),
  };
  notification.captures.push(capture);

  writeFileSync(filePath, JSON.stringify(notification, null, 2), 'utf-8');
}

export function deletePendingNotification(cwd: string): void {
  const filePath = metaPath(cwd, PENDING_FILE);
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
    } catch {
      // Silent — best-effort cleanup
    }
  }
}

/**
 * Returns session capture count from pending notification.
 * Used by hook to inject captured count in hookMessage.
 */
export function getSessionCaptureCount(cwd: string): number {
  const pending = readPendingNotification(cwd);
  return pending?.captures.length ?? 0;
}

// ─── Meta-Prompt (code-generated, no disk file) ────────────────────

const SENSITIVITY_CRITERIA: Record<string, string> = {
  high: 'all opinions, experiences, discoveries, questions, conclusions, analogies, judgments. When in doubt, capture.',
  medium:
    'conclusions, deep experiences, significant discoveries, explicit judgments. Skip: simple opinions, incomplete questions, casual remarks.',
  low: 'only verified experience+conclusion pairs, established principles, major discoveries. Skip most.',
};

/**
 * Build meta-prompt XML from config values.
 * No disk file — prompt is generated in memory.
 */
export function buildMetaPrompt(config: InsightConfig): string {
  const criteria =
    SENSITIVITY_CRITERIA[config.sensitivity] ?? SENSITIVITY_CRITERIA.medium;
  return `<auto-insight enabled="${config.enabled}" sensitivity="${config.sensitivity}" max="${config.max_captures_per_session}">
Detect user insights. Call maencof_capture_insight on detection. No confirmation.
Notify: 💡 Insight recorded to L{layer}: "{title}"

${config.sensitivity}: ${criteria}

L2=validated conclusions/principles L5=impressions/questions/exploratory
Ignore: tool requests, file ops, builds, acks, greetings, slash commands.
</auto-insight>`;
}
