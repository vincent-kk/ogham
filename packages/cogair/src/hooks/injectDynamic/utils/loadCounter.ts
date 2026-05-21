import type { HookCounter } from '../../shared/configTypes.js';
import { COUNTER_PATH } from '../../shared/paths.js';
import { safeReadJson } from '../../shared/safeReadJson.js';

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function asNonNegInt(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

export function loadCounter(): HookCounter {
  const raw = safeReadJson(COUNTER_PATH);
  if (!isObj(raw)) return { gemini: 0, codex: 0, is_stale: false };

  // If parent_pid no longer matches the current Claude Code session, the
  // counter belongs to an old session and is logically zero. The hook never
  // rewrites the file — counterManager does that on the next MCP call.
  const recorded = typeof raw.parent_pid === 'number' ? raw.parent_pid : null;
  if (recorded !== null && recorded !== process.ppid) {
    return { gemini: 0, codex: 0, is_stale: true };
  }

  return {
    gemini: asNonNegInt(raw.gemini),
    codex: asNonNegInt(raw.codex),
    is_stale: false,
  };
}
