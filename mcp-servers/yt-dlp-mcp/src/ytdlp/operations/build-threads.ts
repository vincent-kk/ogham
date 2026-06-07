import type { CommentNode } from '../../domain/types.js';

/**
 * Reconstructs nested reply threads from a flat comment list. Replies whose
 * parent is missing are lifted to root. `maxDepth` prunes deeper replies.
 */
export function buildThreads(comments: CommentNode[], maxDepth?: number): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const c of comments) {
    byId.set(c.id, { ...c, replies: [] });
  }

  const roots: CommentNode[] = [];
  for (const node of byId.values()) {
    if (maxDepth !== undefined && node.depth > maxDepth) {
      continue;
    }
    const parent = node.parent ? byId.get(node.parent) : undefined;
    if (parent) {
      parent.replies = parent.replies ?? [];
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
