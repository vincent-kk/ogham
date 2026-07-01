import { readFile, stat } from 'node:fs/promises';

import { normalizeEol } from '@ogham/cross-platform';
import { samePath } from '@ogham/cross-platform/paths';

import {
  AGY_LAST_CONVERSATIONS_PATH,
  agyTranscriptPath,
} from '../../../constants/paths.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// agy keys last_conversations.json by the native cwd it ran in; samePath absorbs
// POSIX/Windows separator and case differences vs cennad's own cwd string.
async function findConversationId(cwd: string): Promise<string | null> {
  const raw = await readFile(AGY_LAST_CONVERSATIONS_PATH, 'utf8');
  const map: unknown = JSON.parse(raw);
  if (!isRecord(map)) return null;
  for (const [key, value] of Object.entries(map))
    if (typeof value === 'string' && samePath(key, cwd)) return value;

  return null;
}

function extractPlannerResponse(jsonl: string): string | null {
  let answer: string | null = null;
  for (const line of normalizeEol(jsonl).split('\n')) {
    if (line.trim().length === 0) continue;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (
      isRecord(entry) &&
      entry.source === 'MODEL' &&
      entry.type === 'PLANNER_RESPONSE' &&
      entry.status === 'DONE' &&
      typeof entry.content === 'string' &&
      entry.content.trim().length > 0
    )
      answer = entry.content;
  }
  return answer;
}

// Recovers the answer agy persisted to disk when `agy -p` drops stdout (#76).
// Reads agy's undocumented internal store read-only; `since` rejects a stale
// transcript from an earlier run in the same cwd. Throws on missing/unreadable
// files — resolveTranscript converts any throw into a null fallback.
export async function readAgyTranscript(
  cwd: string,
  since: number,
): Promise<string | null> {
  const convId = await findConversationId(cwd);
  if (convId === null) return null;
  const transcript = agyTranscriptPath(convId);
  const info = await stat(transcript);
  if (info.mtimeMs < since) return null;
  return extractPlannerResponse(await readFile(transcript, 'utf8'));
}
