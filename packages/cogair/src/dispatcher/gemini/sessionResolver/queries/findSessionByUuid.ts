import type { GeminiSessionEntry } from './parseListSessions.js';

export function findSessionByUuid(
  entries: GeminiSessionEntry[],
  uuid: string,
): GeminiSessionEntry | null {
  const target = uuid.toLowerCase();
  return entries.find((e) => e.sessionId === target) ?? null;
}
