import { z } from 'zod';

import { segmentsToText } from '../../postprocess/segments-to-text.js';
import { cacheKey } from '../../utils/cache-key.js';
import { subtitlesOperation } from '../../ytdlp/operations/subtitles.js';
import { handleToolExecution } from '../handle.js';
import type { ToolDefinition } from '../tool-definition.js';

import { READ_ONLY } from './annotations.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
  language: z
    .string()
    .regex(/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/)
    .optional()
    .describe("Language code (default 'en')."),
};

const description = `Get raw subtitles with timestamps preserved (json3-derived, one line per cue).

Args: url (string); language (optional, default 'en').
Returns: timestamped lines plus structuredContent { videoId, language, format, segments }.
Use when: you need timing data. Don't use when: you want clean prose (use ytdlp_download_transcript).`;

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
            const language = args.language ?? 'en';
            const result = await service.execute(
              {
                cacheKey: cacheKey('subtitles', args.url, { language }),
                cacheable: true,
                signal: extra.signal,
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
