import { z } from 'zod';

import { thumbnailOperation } from '../../ytdlp/operations/thumbnail.js';
import { handleToolExecution } from '../handle.js';
import type { ToolDefinition } from '../tool-definition.js';
import { WRITES_FILE } from './annotations.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
};

const description = `Download the video thumbnail (converted to JPG) into the downloads directory.

Args: url. Returns: the saved file path plus structuredContent { path, bytes }.
Note: writes a file to disk. Use when: you need the cover image.`;

export const thumbnailTool: ToolDefinition = {
  name: 'ytdlp_get_thumbnail',
  enabledBy: 'thumbnail',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_thumbnail',
      { title: 'Download thumbnail', description, inputSchema, annotations: WRITES_FILE },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const result = await service.execute({ cacheable: false, signal: extra.signal }, (ctx) =>
              thumbnailOperation(ctx, { url: args.url }),
            );
            return {
              text: `Thumbnail saved: ${result.path} (${result.bytes} bytes)`,
              structuredContent: { ...result },
            };
          },
          { errorPrefix: 'Error downloading thumbnail', characterLimit: config.extraction.characterLimit },
        ),
    );
  },
};
