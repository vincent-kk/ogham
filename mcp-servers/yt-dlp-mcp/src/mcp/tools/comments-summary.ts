import { z } from 'zod';

import type { CommentResult } from '@/domain/types.js';
import { truncate } from '@/postprocess/truncate.js';
import { cacheKey } from '@/utils/cache-key.js';
import { buildThreads } from '@/ytdlp/operations/build-threads.js';
import { commentsOperation } from '@/ytdlp/operations/comments.js';
import { renderMarkdownTree } from '@/ytdlp/operations/render-markdown-tree.js';

import { READ_ONLY } from './utils/annotations.js';
import { handleToolExecution } from './utils/handle.js';
import type { ToolDefinition } from './utils/tool-definition.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
  maxComments: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Max comments to include (1-50, default 10).'),
  view: z
    .enum(['flat', 'threaded'])
    .optional()
    .describe("'flat' (default) or 'threaded'."),
};

const outputSchema = {
  videoId: z.string(),
  count: z.number(),
  summary: z.string(),
};

const description = `Summarize a video's top comments in human-readable form.
Returns: a formatted digest + structuredContent { videoId, count, summary }.
Use when you want a quick read; not for structured data (use ytdlp_get_comments).`;

function renderFlat(result: CommentResult, limit: number): string {
  const lines = result.comments.slice(0, limit).map((c) => {
    const tag = c.isUploader ? ' [UPLOADER]' : '';
    return `- **${c.author}**${tag} · ${c.likeCount ?? 0} likes: ${truncate(c.text.replace(/\s+/g, ' '), 300, '…')}`;
  });
  return `# Comments (${result.count} total)\n\n${lines.join('\n') || 'No comments.'}`;
}

export const commentsSummaryTool: ToolDefinition = {
  name: 'ytdlp_get_comments_summary',
  enabledBy: 'commentsSummary',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_comments_summary',
      {
        title: 'Comments summary',
        description,
        inputSchema,
        outputSchema,
        annotations: READ_ONLY,
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const limit = args.maxComments ?? 10;
            const params = {
              url: args.url,
              maxComments: limit,
              sortOrder: 'top' as const,
            };
            const result = await service.execute(
              {
                cacheKey: cacheKey('comments-summary', args.url, { limit }),
                cacheable: true,
                signal: extra.signal,
              },
              (ctx) => commentsOperation(ctx, params),
            );
            const text =
              (args.view ?? 'flat') === 'threaded'
                ? renderMarkdownTree(
                    buildThreads(result.comments).slice(0, limit),
                  )
                : renderFlat(result, limit);
            return {
              text,
              structuredContent: {
                videoId: result.videoId,
                count: result.count,
                summary: text,
              },
            };
          },
          {
            errorPrefix: 'Error summarizing comments',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
