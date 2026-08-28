import type { ReplyProperty } from "./wire.js";
import { parseNumericId } from "./parseNumericId.js";

/** Parse the observed reply-property wire shape without trusting optional fields. */
export function parseReplyProperty(value: unknown): ReplyProperty | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  return {
    parentThreadId: parseNumericId(record.parent_thread_id),
    deleted: record.deleted === true,
    lastBody:
      typeof record.last_thread_body === "string"
        ? record.last_thread_body
        : null,
  };
}
