import { ErrorCode, YtDlpMcpError } from '../../domain/errors.js';
import type { CommentResult } from '../../domain/types.js';
import { asRecordArray, asString } from '../../utils/coerce.js';
import { parseVideoId } from '../../utils/parse-video-id.js';
import { isValidUrl } from '../../utils/validate-url.js';
import { buildCommentExtractorArgs } from './comment-extractor-args.js';
import type { OpContext } from './context.js';
import { fetchInfoJson } from './info-json.js';
import { normalizeComments } from './normalize-comments.js';

export interface CommentsParams {
  url: string;
  maxComments: number;
  sortOrder: 'top' | 'new';
  maxParents?: number;
  maxReplies?: number;
  maxRepliesPerThread?: number;
}

export async function commentsOperation(ctx: OpContext, params: CommentsParams): Promise<CommentResult> {
  if (!isValidUrl(params.url)) {
    throw new YtDlpMcpError(ErrorCode.INVALID_INPUT, 'Invalid or unsupported URL');
  }
  const info = await fetchInfoJson(ctx, params.url, ['--write-comments', ...buildCommentExtractorArgs(params)]);
  const comments = normalizeComments(asRecordArray(info.comments));
  return {
    videoId: asString(info.id) ?? parseVideoId(params.url) ?? 'unknown',
    count: comments.length,
    rootCount: comments.filter((c) => c.depth === 0).length,
    replyCount: comments.filter((c) => c.depth > 0).length,
    comments,
  };
}
