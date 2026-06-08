import { z } from 'zod';

import { thumbnailOperation } from '@/ytdlp/operations/thumbnail.js';

import { WRITES_FILE } from './annotations.js';
import { handleToolExecution } from './handle.js';
import type { ToolDefinition } from './tool-definition.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
};

const description = `Download a video's thumbnail (converted to JPG) into the downloads directory.
Returns: the saved file path + structuredContent { path, bytes }.
Writes a file. Use when you need the cover image.`;

export const thumbnailTool: ToolDefinition = {
  name: 'ytdlp_get_thumbnail',
  enabledBy: 'thumbnail',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_thumbnail',
      {
        title: 'Download thumbnail',
        description,
        inputSchema,
        annotations: WRITES_FILE,
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const result = await service.execute(
              { cacheable: false, signal: extra.signal },
              (ctx) => thumbnailOperation(ctx, { url: args.url }),
            );
            return {
              text: `Thumbnail saved: ${result.path} (${result.bytes} bytes)`,
              structuredContent: { ...result },
            };
          },
          {
            errorPrefix: 'Error downloading thumbnail',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
