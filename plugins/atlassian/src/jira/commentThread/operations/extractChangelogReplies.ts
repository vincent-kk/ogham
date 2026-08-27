import type { JiraChangelog, ReplyCandidate } from "./wire.js";
import { parseNumericId } from "./parseNumericId.js";

/** Change-item field name the observed plugin writes; a profile cannot override it in schema v1. */
export const CHANGELOG_COMMENT_FIELD = "Comment";

/**
 * Recover reply candidates from an issue changelog.
 * @param changelog `issue.changelog`; `undefined` when the expand was ignored.
 * @returns One candidate per `Comment` item (id `<historyId>` or `<historyId>:<index>` when a history holds several) and a warning per item whose `to` is not a numeric id.
 */
export function extractChangelogReplies(changelog: JiraChangelog | undefined): {
  replies: ReplyCandidate[];
  warnings: string[];
} {
  const replies: ReplyCandidate[] = [];
  const warnings: string[] = [];
  for (const history of changelog?.histories ?? []) {
    const items = (history.items ?? []).filter(
      (item) => item.field === CHANGELOG_COMMENT_FIELD,
    );
    items.forEach((item, index) => {
      const rootId = parseNumericId(item.to);
      if (rootId === null) {
        warnings.push(
          `changelog history ${history.id}: Comment item with unusable "to" (${String(item.to)}) skipped`,
        );
        return;
      }
      replies.push({
        id: items.length === 1 ? String(history.id) : `${history.id}:${index}`,
        rootId,
        author:
          history.author?.displayName ?? history.author?.name ?? "unknown",
        created: history.created,
        body: item.toString ?? "",
      });
    });
  }
  return { replies, warnings };
}
