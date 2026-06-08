import type { CommentNode } from '../../domain/types.js';
import { asBoolean } from '../../utils/as-boolean.js';
import { asNumber } from '../../utils/as-number.js';
import { asString } from '../../utils/as-string.js';

/** Normalizes raw yt-dlp comments into a flat list with computed reply depth. */
export function normalizeComments(
  raw: Record<string, unknown>[],
): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const c of raw) {
    const id = asString(c.id);
    if (!id) continue;
    const parentRaw = asString(c.parent);
    byId.set(id, {
      id,
      text: asString(c.text) ?? '',
      author: asString(c.author) ?? 'unknown',
      authorId: asString(c.author_id),
      likeCount: asNumber(c.like_count),
      isPinned: asBoolean(c.is_pinned),
      isUploader: asBoolean(c.author_is_uploader),
      isFavorited: asBoolean(c.is_favorited),
      timestamp: asNumber(c.timestamp),
      timeText: asString(c._time_text) ?? asString(c.time_text),
      parent: parentRaw && parentRaw !== 'root' ? parentRaw : undefined,
      depth: 0,
    });
  }

  for (const node of byId.values()) {
    let depth = 0;
    let parent = node.parent;
    let guard = 0;
    while (parent !== undefined && guard < 20) {
      const parentNode = byId.get(parent);
      if (!parentNode) break;
      depth += 1;
      parent = parentNode.parent;
      guard += 1;
    }
    node.depth = depth;
  }

  return [...byId.values()];
}
