import { z } from 'zod';

import { formatMetadataSummary } from '../../postprocess/metadata-summary.js';
import { cacheKey } from '../../utils/cache-key.js';
import { metadataOperation } from '../../ytdlp/operations/metadata.js';
import { handleToolExecution } from '../handle.js';
import type { ToolDefinition } from '../tool-definition.js';

import { READ_ONLY } from './annotations.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
};

const description = `Get a concise, human-readable summary of a video's key metadata.

Args: url (string).
Returns: a formatted summary (title, channel, duration, views, likes, upload date, tags, description preview).
Use when: you want a quick overview. Don't use when: you need full structured data (use ytdlp_get_video_metadata).`;

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
