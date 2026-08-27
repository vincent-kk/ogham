import type { ThreadEntry } from "../../../types/index.js";
import { normalizeBody } from "./normalizeBody.js";
import { numericIdsEqual } from "./parseNumericId.js";
import type { ReplyProperty } from "./wire.js";

/**
 * Annotate the newest reply under a root with the property snapshot.
 * @param root Root entry whose `replies` are already sorted ascending.
 * @param property Parsed entity property of that root.
 * @returns A warning when the snapshot body does not match the newest reply; nothing is annotated in that case (R3 best-effort).
 */
export function applyReplyProperty(
  root: ThreadEntry,
  property: ReplyProperty,
): string | null {
  const newest = root.replies?.at(-1);
  if (!newest) return null;
  if (property.lastBody === null)
    return `comment ${root.id}: property last_thread_body is missing; nesting/deleted left unset`;
  if (normalizeBody(property.lastBody) !== normalizeBody(newest.body))
    return `comment ${root.id}: property snapshot does not match the newest changelog reply; nesting/deleted left unset`;
  if (
    property.parentThreadId !== null &&
    !numericIdsEqual(property.parentThreadId, root.id)
  )
    newest.nested = true;
  if (property.deleted) newest.deleted = true;
  return null;
}
