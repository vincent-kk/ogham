import { z } from 'zod';

import { READ_ONLY } from '@/mcp/tools/utils/annotations.js';
import { handleToolExecution } from '@/mcp/tools/utils/handle.js';
import type { ToolDefinition } from '@/mcp/tools/utils/tool-definition.js';
import { cacheKey } from '@/utils/cache-key.js';

import { subtitlesOperation } from '../operations/subtitles.js';
import { segmentsToText } from '../postprocess/segments-to-text.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
  language: z
    .string()
    .regex(
      /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/,
      'Use a language code like "en", "ko", or "pt-BR".',
    )
    .optional()
    .describe(
      "Subtitle language (e.g. 'en', 'ko'). Defaults to YTDLP_DEFAULT_SUB_LANG ('en' if unset).",
    ),
};

const description = `Get raw subtitles with timestamps preserved (one line per cue).
Returns: timestamped lines + structuredContent { videoId, language, format, segments }.
Use when you need cue-level timing data; not for clean prose (use ytdlp_download_transcript).`;

export const subtitlesTool: ToolDefinition = {
  name: 'ytdlp_get_video_subtitles',
  enabledBy: 'subtitles',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_video_subtitles',
      {
        title: 'Get raw subtitles',
        description,
        inputSchema,
        annotations: READ_ONLY,
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const language = args.language ?? config.extraction.defaultSubLang;
            const result = await service.execute(
              {
                cacheKey: cacheKey('subtitles', args.url, { language }),
                cacheable: true,
                signal: extra.signal,
                throttle: 'subtitle',
              },
              (ctx) => subtitlesOperation(ctx, { url: args.url, language }),
            );
            const segments = result.segments ?? [];
            return {
              text: segmentsToText(segments, { timestamps: true }),
              structuredContent: {
                videoId: result.videoId,
                language: result.language,
                format: result.format,
                segments,
              },
            };
          },
          {
            errorPrefix: 'Error fetching subtitles',
            characterLimit: config.extraction.maxTranscriptLength,
          },
        ),
    );
  },
};
