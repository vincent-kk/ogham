export interface ParsedCodexStream {
  threadId: string | null;
  resolvedModel: string | null;
  response: string | null;
}

type EventLike = Record<string, unknown>;

function isObject(value: unknown): value is EventLike {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(obj: EventLike, key: string): string | null {
  const value = obj[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readObject(obj: EventLike, key: string): EventLike | null {
  const value = obj[key];
  return isObject(value) ? value : null;
}

const THREAD_KEYS = [
  'thread_id',
  'threadId',
  'session_id',
  'sessionId',
] as const;

function findThreadId(...sources: EventLike[]): string | null {
  for (const source of sources) {
    for (const key of THREAD_KEYS) {
      const value = readString(source, key);
      if (value) return value;
    }
  }
  return null;
}

export function parseCodexStream(stdout: string): ParsedCodexStream {
  let threadId: string | null = null;
  let resolvedModel: string | null = null;
  let response: string | null = null;
  if (!stdout) return { threadId, resolvedModel, response };

  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isObject(parsed)) continue;

    const inner = readObject(parsed, 'msg') ?? parsed;
    if (!threadId) threadId = findThreadId(inner, parsed);

    const candidateModel =
      readString(inner, 'model') ?? readString(parsed, 'model');
    if (candidateModel) resolvedModel = candidateModel;

    const type = readString(parsed, 'type');
    if (type === 'item.completed') {
      const item = readObject(parsed, 'item');
      if (item && readString(item, 'type') === 'agent_message') {
        const text = readString(item, 'text');
        if (text !== null) response = text;
      }
    } else if (type === 'agent.message' || type === 'agent.complete') {
      const text = readString(parsed, 'text');
      if (text !== null) response = text;
    }
  }

  return { threadId, resolvedModel, response };
}
