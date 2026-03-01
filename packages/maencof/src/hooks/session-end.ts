/**
 * @file session-end.ts
 * @description SessionEnd Hook — Save session summary + clean up sessions older than 30 days
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { isMaencofVault, maencofPath, metaPath } from './shared.js';

export interface SessionEndInput {
  session_id?: string;
  cwd?: string;
  /** Skills invoked during the session. */
  skills_used?: string[];
  /** Files modified during the session. */
  files_modified?: string[];
}

export interface SessionEndResult {
  continue: boolean;
}

/** Session file retention period (days) */
const SESSION_RETENTION_DAYS = 30;

/**
 * SessionEnd Hook handler.
 * 1. Save current session summary to .maencof-meta/sessions/{timestamp}.md
 * 2. Clean up session files older than 30 days
 */
export function runSessionEnd(input: SessionEndInput): SessionEndResult {
  const cwd = input.cwd ?? process.cwd();

  if (!isMaencofVault(cwd)) {
    return { continue: true };
  }

  const sessionsDir = metaPath(cwd, 'sessions');
  ensureDir(sessionsDir);

  // Save session summary
  const summary = buildSessionSummary(input, cwd);
  const fileName = buildSessionFileName();
  const filePath = join(sessionsDir, fileName);

  try {
    writeFileSync(filePath, summary, 'utf-8');
  } catch {
    // Ignore write failure (must not block session exit)
  }

  // Clean up old session files
  cleanOldSessions(sessionsDir);

  return { continue: true };
}

/**
 * Build a session summary markdown string.
 * Includes usage-stats.json (cumulative) and stale-nodes.json data when available.
 */
function buildSessionSummary(input: SessionEndInput, cwd: string): string {
  const now = new Date().toISOString();
  const sessionId = input.session_id ?? 'unknown';

  const lines: string[] = [
    `# Session Summary`,
    ``,
    `- **Session ID**: ${sessionId}`,
    `- **Ended at**: ${now}`,
    ``,
  ];

  // Skills used in this session
  const skills = input.skills_used ?? [];
  if (skills.length > 0) {
    lines.push(`## Skills Used`);
    lines.push(``);
    for (const skill of skills) {
      lines.push(`- ${skill}`);
    }
    lines.push(``);
  }

  // Files modified in this session
  const files = input.files_modified ?? [];
  if (files.length > 0) {
    lines.push(`## Files Modified`);
    lines.push(``);
    for (const file of files) {
      lines.push(`- ${file}`);
    }
    lines.push(``);
  }

  // Read usage-stats.json (cumulative)
  const usageStats = readJsonSafe<Record<string, number>>(
    metaPath(cwd, 'usage-stats.json'),
  );

  // Read stale-nodes.json
  const staleNodes = readJsonSafe<{ paths: string[]; updatedAt: string }>(
    maencofPath(cwd, 'stale-nodes.json'),
  );

  const hasUsageStats =
    usageStats !== null && Object.keys(usageStats).length > 0;
  const hasStaleNodes =
    staleNodes !== null &&
    Array.isArray(staleNodes.paths) &&
    staleNodes.paths.length > 0;

  if (hasUsageStats) {
    lines.push(`## Vault Tool Usage (Cumulative)`);
    lines.push(``);
    for (const [tool, count] of Object.entries(usageStats!)) {
      lines.push(`- ${tool}: ${count}`);
    }
    lines.push(``);
  }

  if (hasStaleNodes) {
    lines.push(`## Pending Index Updates (Stale Nodes)`);
    lines.push(``);
    for (const path of staleNodes!.paths) {
      lines.push(`- ${path}`);
    }
    lines.push(``);
  }

  const hasSessionActivity = skills.length > 0 || files.length > 0;

  if (!hasUsageStats && !hasStaleNodes && !hasSessionActivity) {
    lines.push(`> No activity recorded in this session.`);
    lines.push(``);
  }

  if (hasUsageStats || hasStaleNodes) {
    lines.push(
      `> Per-session statistics will be improved in a future release.`,
    );
    lines.push(``);
  }

  return lines.join('\n');
}

/**
 * Safely read a JSON file. Returns null if the file is missing or unparseable.
 */
function readJsonSafe<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

/**
 * Generate a session file name (YYYY-MM-DD-HHmmss.md).
 */
function buildSessionFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${HH}${min}${ss}.md`;
}

/**
 * Delete session files older than 30 days from the sessions/ directory.
 */
function cleanOldSessions(sessionsDir: string): void {
  if (!existsSync(sessionsDir)) return;

  const cutoffMs = SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const filePath = join(sessionsDir, file);
      try {
        const stat = statSync(filePath);
        if (now - stat.mtimeMs > cutoffMs) {
          unlinkSync(filePath);
        }
      } catch {
        // Ignore individual file errors
      }
    }
  } catch {
    // Ignore directory read errors
  }
}

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
