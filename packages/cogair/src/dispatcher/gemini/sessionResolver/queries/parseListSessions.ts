import { ENTRY_PATTERN } from '../constants/entryPattern.js';

export interface GeminiSessionEntry {
  index: number;
  title: string;
  sessionId: string;
}

export function parseListSessions(stdout: string): GeminiSessionEntry[] {
  const entries: GeminiSessionEntry[] = [];
  if (!stdout) return entries;
  for (const line of stdout.split('\n')) {
    const match = line.match(ENTRY_PATTERN);
    if (!match) continue;
    entries.push({
      index: Number(match[1]),
      title: match[2].trim(),
      sessionId: match[3].toLowerCase(),
    });
  }
  return entries;
}
