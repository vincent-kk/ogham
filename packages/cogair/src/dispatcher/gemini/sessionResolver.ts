export interface GeminiSessionEntry {
  index: number;
  title: string;
  sessionId: string;
}

const ENTRY_PATTERN = /^\s*(\d+)\.\s+(.*)\s+\[([0-9a-f-]{36})\]\s*$/i;

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

export function findLatestSession(
  entries: GeminiSessionEntry[],
): GeminiSessionEntry | null {
  // cogair guarantees one session per gemini-cwd, so the latest entry is
  // simply the first one the CLI prints. If gemini changes its ordering,
  // pick the lowest-index entry which is also typically the newest.
  if (entries.length === 0) return null;
  return entries.reduce((min, e) => (e.index < min.index ? e : min));
}

export function findSessionByUuid(
  entries: GeminiSessionEntry[],
  uuid: string,
): GeminiSessionEntry | null {
  const target = uuid.toLowerCase();
  return entries.find((e) => e.sessionId === target) ?? null;
}
