import { normalizeEol } from '@ogham/cross-platform';

import { findThreadId } from './utils/findThreadId.js';
import { isObject } from './utils/isObject.js';
import { readEventText } from './utils/readEventText.js';
import { readObject } from './utils/readObject.js';
import { readString } from './utils/readString.js';

export interface ParsedCodexStream {
  threadId: string | null;
  resolvedModel: string | null;
  response: string | null;
  // Why the turn failed, as codex reported it (`error` / `turn.failed` events).
  // stderr does not carry this — on a usage-limit run it holds only a stdin
  // notice — so errorMap classifies and relays this instead.
  errorMessage: string | null;
}

export function parseCodexStream(stdout: string): ParsedCodexStream {
  let threadId: string | null = null;
  let resolvedModel: string | null = null;
  let response: string | null = null;
  let errorMessage: string | null = null;
  if (!stdout) return { threadId, resolvedModel, response, errorMessage };

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

    const text = readEventText(parsed);
    if (text.response !== undefined) response = text.response;
    if (text.errorMessage !== undefined) errorMessage = text.errorMessage;
  }

  return { threadId, resolvedModel, response, errorMessage };
}
