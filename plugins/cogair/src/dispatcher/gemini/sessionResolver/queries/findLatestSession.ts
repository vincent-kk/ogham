import type { GeminiSessionEntry } from './parseListSessions.js';

export function findLatestSession(
  entries: GeminiSessionEntry[],
): GeminiSessionEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((min, e) => (e.index < min.index ? e : min));
}
