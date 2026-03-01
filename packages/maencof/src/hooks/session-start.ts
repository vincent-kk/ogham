/**
 * @file session-start.ts
 * @description SessionStart Hook — Knowledge tree check, WAL recovery detection, schedule review, previous session summary load
 * C1 constraint: Must complete within 5 seconds. Heavy index builds are delegated to Skills.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { CompanionIdentityMinimal } from '../types/companion-guard.js';
import { isValidCompanionIdentity } from '../types/companion-guard.js';
import { isMaencofVault, metaPath } from './shared.js';

export interface SessionStartInput {
  session_id?: string;
  cwd?: string;
}

export interface SessionStartResult {
  continue: boolean;
  suppressOutput?: boolean;
  /** Message to display to the user */
  message?: string;
}

/**
 * SessionStart Hook handler.
 * 1. Check .maencof/ directory exists → prompt setup if missing
 * 2. Load companion identity → display greeting
 * 3. Detect leftover WAL → suggest recovery
 * 4. Check schedule-log.json → suggest organize skill
 * 5. Load recent session summary → display previous context
 * 6. Check data-sources.json → suggest connect if missing
 */
export function runSessionStart(input: SessionStartInput): SessionStartResult {
  const cwd = input.cwd ?? process.cwd();
  const messages: string[] = [];

  // 1. Check maencof vault
  if (!isMaencofVault(cwd)) {
    return {
      continue: true,
      message:
        '[maencof] Vault is not initialized. Run `/maencof:setup` to get started.',
    };
  }

  // 2. Load companion identity
  const companion = loadCompanionIdentity(cwd);
  if (companion) {
    messages.push(`[maencof:${companion.name}] ${companion.greeting}`);
  }

  // 3. Detect leftover WAL
  const walPath = metaPath(cwd, 'wal.json');
  if (existsSync(walPath)) {
    messages.push(
      '[maencof] Incomplete transaction (WAL) detected from a previous session. Run `/maencof:doctor` to diagnose.',
    );
  }

  // 4. Check schedule-log.json
  const scheduleLogPath = metaPath(cwd, 'schedule-log.json');
  if (existsSync(scheduleLogPath)) {
    try {
      const log = JSON.parse(readFileSync(scheduleLogPath, 'utf-8')) as {
        pending?: unknown[];
      };
      if (log.pending && log.pending.length > 0) {
        messages.push(
          `[maencof] ${log.pending.length} pending task(s) found. Run \`/maencof:organize\` to process.`,
        );
      }
    } catch {
      // Ignore schedule-log.json parse failures
    }
  }

  // 5. Load recent session summary
  const sessionsDir = metaPath(cwd, 'sessions');
  if (existsSync(sessionsDir)) {
    const recentSummary = loadRecentSessionSummary(sessionsDir);
    if (recentSummary) {
      messages.push(`[maencof] Previous session summary:\n${recentSummary}`);
    }
  }

  // 6. Check data-sources.json
  const dataSourcesPath = metaPath(cwd, 'data-sources.json');
  if (!existsSync(dataSourcesPath)) {
    messages.push(
      '[maencof] No external data sources connected. Run `/maencof:connect` to set up.',
    );
  }

  return {
    continue: true,
    message: messages.length > 0 ? messages.join('\n\n') : undefined,
  };
}

/**
 * Load companion identity from .maencof-meta/companion-identity.json.
 * Uses manual type guard (no Zod) to keep hook bundle small.
 * Graceful degradation: returns null on any failure.
 */
function loadCompanionIdentity(
  cwd: string,
): Pick<CompanionIdentityMinimal, 'name' | 'greeting'> | null {
  const identityPath = metaPath(cwd, 'companion-identity.json');
  if (!existsSync(identityPath)) return null;
  try {
    const raw: unknown = JSON.parse(readFileSync(identityPath, 'utf-8'));
    return isValidCompanionIdentity(raw)
      ? { name: raw.name, greeting: raw.greeting }
      : null;
  } catch {
    return null;
  }
}

/**
 * Load the most recent session summary from the sessions/ directory.
 */
function loadRecentSessionSummary(sessionsDir: string): string | null {
  try {
    const files = readdirSync(sessionsDir)
      .filter((f: string) => f.endsWith('.md'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const latestFile = join(sessionsDir, files[0]);
    const content = readFileSync(latestFile, 'utf-8');

    // Extract summary section (first 10 lines)
    const lines = content.split('\n').slice(0, 10).join('\n');
    return lines.trim() || null;
  } catch {
    return null;
  }
}
