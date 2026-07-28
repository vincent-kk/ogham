import { isRecord } from '../../../utils/isRecord.js';

// stream-json carries the conversation id twice: in the opening `init` event and
// again in the final `result`. Either one lets a later turn resume that exact
// conversation instead of "whatever ran last in this directory".
export function findAgyConversationId(stdout: string): string | null {
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;
    const holder = isRecord(parsed.result)
      ? parsed.result
      : isRecord(parsed.init)
        ? parsed.init
        : parsed;
    const id = holder.conversation_id ?? parsed.conversation_id;
    if (typeof id === 'string' && id.trim().length > 0) return id.trim();
  }
  return null;
}
