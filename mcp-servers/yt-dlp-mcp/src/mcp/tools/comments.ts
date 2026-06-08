import { z } from 'zod';

import { cacheKey } from '@/utils/cache-key.js';
import { buildThreads } from '@/ytdlp/operations/build-threads.js';
import { commentsOperation } from '@/ytdlp/operations/comments.js';
import { renderMarkdownTree } from '@/ytdlp/operations/render-markdown-tree.js';

import { READ_ONLY } from './annotations.js';
import { handleToolExecution } from './handle.js';
import type { ToolDefinition } from './tool-definition.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
  maxComments: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Max comments (1-100, default 20).'),
  sortOrder: z
    .enum(['top', 'new'])
    .optional()
    .describe("Sort: 'top' (default) or 'new'."),
  view: z
    .enum(['flat', 'threaded'])
    .optional()
    .describe("'flat' (default) or 'threaded' reply trees."),
  responseFormat: z
    .enum(['json', 'markdown_tree'])
    .optional()
    .describe(
      "'json' (default) or 'markdown_tree' (AI-friendly threaded Markdown).",
    ),
  maxParents: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .describe('Max top-level (parent) comments to fetch.'),
  maxReplies: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .describe('Max replies to fetch across all threads.'),
  maxRepliesPerThread: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .optional()
    .describe('Max replies to fetch per thread.'),
  maxDepth: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe('Max reply nesting depth kept in threaded views.'),
};

const description = `Extract video comments as JSON or threaded Markdown.
Returns: comments + structuredContent { videoId, count, rootCount, replyCount, comments }.
Use when analyzing discussion in depth; for a quick read use ytdlp_get_comments_summary. Mainly YouTube; degrades to root-only elsewhere.`;

export const commentsTool: ToolDefinition = {
  name: 'ytdlp_get_comments',
  enabledBy: 'comments',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_comments',
      {
        title: 'Get comments',
        description,
        inputSchema,
        annotations: READ_ONLY,
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const params = {
              url: args.url,
              maxComments: args.maxComments ?? 20,
              sortOrder: args.sortOrder ?? 'top',
              maxParents: args.maxParents,
              maxReplies: args.maxReplies,
              maxRepliesPerThread: args.maxRepliesPerThread,
            };
            const result = await service.execute(
              {
                cacheKey: cacheKey('comments', args.url, {
                  ...params,
                  url: undefined,
                }),
                cacheable: true,
                signal: extra.signal,
              },
              (ctx) => commentsOperation(ctx, params),
            );

            const threaded =
              (args.view ?? 'flat') === 'threaded' ||
              args.responseFormat === 'markdown_tree';
            const comments = threaded
              ? buildThreads(result.comments, args.maxDepth)
              : result.comments;
            const structuredContent = { ...result, comments };
            const text =
              args.responseFormat === 'markdown_tree'
                ? renderMarkdownTree(
                    buildThreads(result.comments, args.maxDepth),
                  )
                : `\`\`\`json\n${JSON.stringify(structuredContent, null, 2)}\n\`\`\``;
            return { text, structuredContent };
          },
          {
            errorPrefix: 'Error extracting comments',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
