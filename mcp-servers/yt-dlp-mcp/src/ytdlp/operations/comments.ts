import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { CommentNode, CommentResult } from '../../domain/types.js';
import { asBoolean, asNumber, asRecordArray, asString } from '../../utils/coerce.js';
import { parseVideoId } from '../../utils/parse-video-id.js';
import { isValidUrl } from '../../utils/validate-url.js';
import type { OpContext } from './context.js';
import { fetchInfoJson } from './info-json.js';

export interface CommentsParams {
  url: string;
  maxComments: number;
  sortOrder: 'top' | 'new';
  maxParents?: number;
  maxReplies?: number;
  maxRepliesPerThread?: number;
}

function buildExtractorArgs(params: CommentsParams): string[] {
  const parts = [`comment_sort=${params.sortOrder}`];
  const counts: Array<number | undefined> = [
    params.maxComments,
    params.maxParents,
    params.maxReplies,
    params.maxRepliesPerThread,
  ];
  while (counts.length > 0 && counts[counts.length - 1] === undefined) {
    counts.pop();
  }
  if (counts.length > 0) {
    parts.push(`max_comments=${counts.map((c) => c ?? 'all').join(',')}`);
  }
  return ['--extractor-args', `youtube:${parts.join(';')}`];
}

/** Normalizes raw yt-dlp comments into a flat list with computed reply depth. */
function normalizeComments(raw: Record<string, unknown>[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const c of raw) {
    const id = asString(c.id);
    if (!id) {
      continue;
    }
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
      if (!parentNode) {
        break;
      }
      depth += 1;
      parent = parentNode.parent;
      guard += 1;
    }
    node.depth = depth;
  }

  return [...byId.values()];
}

export async function commentsOperation(ctx: OpContext, params: CommentsParams): Promise<CommentResult> {
  if (!isValidUrl(params.url)) {
    throw new YtDlpMcpError(ErrorCode.INVALID_INPUT, 'Invalid or unsupported URL');
  }
  const info = await fetchInfoJson(ctx, params.url, ['--write-comments', ...buildExtractorArgs(params)]);
  const comments = normalizeComments(asRecordArray(info.comments));
  return {
    videoId: asString(info.id) ?? parseVideoId(params.url) ?? 'unknown',
    count: comments.length,
    rootCount: comments.filter((c) => c.depth === 0).length,
    replyCount: comments.filter((c) => c.depth > 0).length,
    comments,
  };
}
