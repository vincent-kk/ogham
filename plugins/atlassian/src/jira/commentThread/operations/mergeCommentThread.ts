import type { ThreadEntry } from "../../../types/index.js";
import { applyReplyProperty } from "./applyReplyProperty.js";
import { compareEntries } from "./compareEntries.js";
import { markSuspectedDuplicates } from "./markSuspectedDuplicates.js";
import type { JiraComment, ReplyCandidate, ReplyProperty } from "./wire.js";

/**
 * Assemble the thread: roots from the standard API, replies from the changelog, corrections from properties.
 * @param comments Standard comments of the page being returned.
 * @param replies Candidates from `extractChangelogReplies`.
 * @param properties Parsed properties keyed by root comment id.
 * @param knownCommentIds Every comment id the caller has seen. A reply whose root is known but not in `comments` is counted as "outside this page"; a root nobody has seen becomes an orphan. Defaults to the ids of `comments`.
 * @returns Sorted roots with sorted `replies`; orphans last with `orphan: true`.
 */
export function mergeCommentThread(
  comments: JiraComment[],
  replies: ReplyCandidate[],
  properties: ReadonlyMap<string, ReplyProperty>,
  knownCommentIds: ReadonlySet<string> = new Set(comments.map((c) => c.id)),
): { thread: ThreadEntry[]; warnings: string[] } {
  const warnings: string[] = [];
  const roots = new Map<string, ThreadEntry>(
    comments.map((comment) => [comment.id, toRoot(comment)]),
  );
  const duplicates = markSuspectedDuplicates([...roots.values()], replies);
  const orphans: ThreadEntry[] = [];
  let outsidePage = 0;
  for (const reply of replies) {
    const entry: ThreadEntry = {
      id: reply.id,
      kind: "reply",
      parentId: reply.rootId,
      author: reply.author,
      created: reply.created,
      body: reply.body,
      source: "changelog",
    };
    if (duplicates.has(reply.id)) entry.suspectedDuplicate = true;
    const root = roots.get(reply.rootId);
    if (root) (root.replies ??= []).push(entry);
    else if (knownCommentIds.has(reply.rootId)) outsidePage += 1;
    else orphans.push({ ...entry, orphan: true });
  }
  const thread = [...roots.values()].sort(compareEntries);
  for (const root of thread) {
    root.replies?.sort(compareEntries);
    const property = properties.get(root.id);
    if (property) {
      const warning = applyReplyProperty(root, property);
      if (warning) warnings.push(warning);
    }
  }
  if (outsidePage > 0)
    warnings.push(
      `${outsidePage} reply(ies) belong to comments outside this page`,
    );
  if (orphans.length > 0)
    warnings.push(
      `${orphans.length} reply(ies) point at unknown comment ids and were appended as orphans`,
    );
  return { thread: [...thread, ...orphans.sort(compareEntries)], warnings };
}

function toRoot(comment: JiraComment): ThreadEntry {
  return {
    id: comment.id,
    kind: "comment",
    author: comment.author?.displayName ?? comment.author?.name ?? "unknown",
    created: comment.created,
    body: comment.renderedBody ?? comment.body ?? "",
    source: "standard",
    replies: [],
  };
}
