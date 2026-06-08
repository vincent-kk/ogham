import { z } from 'zod';

import { videoMetadataSchema } from '@/domain/video-metadata-schema.js';
import { formatMetadataSummary } from '@/postprocess/metadata-summary.js';
import { cacheKey } from '@/utils/cache-key.js';
import { metadataOperation } from '@/ytdlp/operations/metadata.js';

import { READ_ONLY } from './utils/annotations.js';
import { handleToolExecution } from './utils/handle.js';
import type { ToolDefinition } from './utils/tool-definition.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
};

const outputSchema = videoMetadataSchema;

const description = `Summarize a video's key metadata in human-readable form.
Returns: a formatted summary (title, channel, duration, views, likes, upload date, tags, description preview).
Use when you want a quick overview; not for full structured fields (use ytdlp_get_video_metadata).`;

export const metadataSummaryTool: ToolDefinition = {
  name: 'ytdlp_get_video_metadata_summary',
  enabledBy: 'metadataSummary',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_video_metadata_summary',
      {
        title: 'Video metadata summary',
        description,
        inputSchema,
        outputSchema,
        annotations: READ_ONLY,
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const meta = await service.execute(
              {
                cacheKey: cacheKey('metadata', args.url),
                cacheable: true,
                signal: extra.signal,
              },
              (ctx) => metadataOperation(ctx, { url: args.url }),
            );
            return {
              text: formatMetadataSummary(meta),
              structuredContent: { ...meta },
            };
          },
          {
            errorPrefix: 'Error generating metadata summary',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
