import { z } from 'zod';

import type { VideoMetadata } from '../../domain/types.js';
import { cacheKey } from '../../utils/cache-key.js';
import { metadataOperation } from '../../ytdlp/operations/metadata.js';
import { handleToolExecution } from '../handle.js';
import type { ToolDefinition } from '../tool-definition.js';

import { READ_ONLY } from './annotations.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      "Subset of metadata keys to return, e.g. ['title','viewCount','uploadDate']. Omit for all.",
    ),
};

const description = `Extract curated video metadata as JSON (no download).

Args: url (string); fields (optional string[] selecting which metadata keys to keep).
Returns: JSON metadata plus structuredContent { videoId, title, channel, viewCount, likeCount, durationSec, uploadDate, tags, … }.
Use when: you need structured data. Don't use when: you want a readable summary (enable ytdlp_get_video_metadata_summary).`;

function selectFields(
  meta: VideoMetadata,
  fields: string[] | undefined,
): Record<string, unknown> {
  const full: Record<string, unknown> = { ...meta };
  if (!fields || fields.length === 0) return full;
  return Object.fromEntries(
    Object.entries(full).filter(([key]) => fields.includes(key)),
  );
}

export const metadataTool: ToolDefinition = {
  name: 'ytdlp_get_video_metadata',
  enabledBy: 'default',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_video_metadata',
      {
        title: 'Get video metadata',
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
            const selected = selectFields(meta, args.fields);
            return {
              text: `\`\`\`json\n${JSON.stringify(selected, null, 2)}\n\`\`\``,
              structuredContent: selected,
            };
          },
          {
            errorPrefix: 'Error extracting video metadata',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
