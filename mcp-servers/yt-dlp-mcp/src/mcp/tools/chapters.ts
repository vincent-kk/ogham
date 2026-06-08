import { z } from 'zod';

import type { ChapterList } from '@/domain/types.js';
import { formatTimestamp } from '@/postprocess/format-timestamp.js';
import { cacheKey } from '@/utils/cache-key.js';
import { chaptersOperation } from '@/ytdlp/operations/chapters.js';

import { READ_ONLY } from './utils/annotations.js';
import { handleToolExecution } from './utils/handle.js';
import type { ToolDefinition } from './utils/tool-definition.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
};

const outputSchema = {
  videoId: z.string(),
  chapters: z.array(
    z.object({
      title: z.string(),
      startMs: z.number(),
      endMs: z.number().optional(),
    }),
  ),
};

const description = `List a video's chapters (section markers with start times).
Returns: a timestamped chapter list + structuredContent { videoId, chapters }.
Use when navigating long videos. Empty list when the video has no chapters.`;

function render(result: ChapterList): string {
  if (result.chapters.length === 0) return `No chapters for ${result.videoId}.`;
  const lines = result.chapters.map(
    (c) => `${formatTimestamp(c.startMs)}  ${c.title}`,
  );
  return `# Chapters (${result.chapters.length})\n\n${lines.join('\n')}`;
}

export const chaptersTool: ToolDefinition = {
  name: 'ytdlp_get_chapters',
  enabledBy: 'chapters',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_chapters',
      {
        title: 'Get chapters',
        description,
        inputSchema,
        outputSchema,
        annotations: READ_ONLY,
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const result = await service.execute(
              {
                cacheKey: cacheKey('chapters', args.url),
                cacheable: true,
                signal: extra.signal,
              },
              (ctx) => chaptersOperation(ctx, { url: args.url }),
            );
            return { text: render(result), structuredContent: { ...result } };
          },
          {
            errorPrefix: 'Error fetching chapters',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
