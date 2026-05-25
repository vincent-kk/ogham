import { normalizeEol } from '@ogham/cross-platform';

import { findThreadId } from './utils/findThreadId.js';
import { isObject } from './utils/isObject.js';
import { readObject } from './utils/readObject.js';
import { readString } from './utils/readString.js';

export interface ParsedCodexStream {
  threadId: string | null;
  resolvedModel: string | null;
  response: string | null;
}

export function parseCodexStream(stdout: string): ParsedCodexStream {
  let threadId: string | null = null;
  let resolvedModel: string | null = null;
  let response: string | null = null;
  if (!stdout) return { threadId, resolvedModel, response };

  for (const rawLine of normalizeEol(stdout).split('\n')) {
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
