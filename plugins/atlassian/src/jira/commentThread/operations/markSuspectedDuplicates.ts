import type { ThreadEntry } from "../../../types/index.js";
import { normalizeBody } from "./normalizeBody.js";
import type { ReplyCandidate } from "./wire.js";

/** Identify reply ids whose author, normalized body, and timestamp match a standard root within two seconds. */
export function markSuspectedDuplicates(
  roots: readonly ThreadEntry[],
  replies: readonly ReplyCandidate[],
): Set<string> {
  return new Set(
    replies
      .filter((reply) =>
        roots.some(
          (root) =>
            root.author === reply.author &&
            normalizeBody(root.body) === normalizeBody(reply.body) &&
            Math.abs(Date.parse(reply.created) - Date.parse(root.created)) <=
              2_000,
        ),
      )
      .map((reply) => reply.id),
  );
}
