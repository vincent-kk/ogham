import { z } from 'zod';

import { downloadOperation } from '@/ytdlp/operations/download.js';

import { WRITES_FILE } from './utils/annotations.js';
import { handleToolExecution } from './utils/handle.js';
import type { ToolDefinition } from './utils/tool-definition.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
  audioFormat: z
    .enum(['m4a', 'mp3'])
    .optional()
    .describe("Audio container (default 'm4a')."),
};

const description = `Extract and download a video's audio track into the downloads directory.
Returns: the saved file path + structuredContent { path, bytes, format }.
Writes a file (not idempotent); audio extraction requires ffmpeg on PATH.`;

export const downloadAudioTool: ToolDefinition = {
  name: 'ytdlp_download_audio',
  enabledBy: 'download',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_download_audio',
      {
        title: 'Download audio',
        description,
        inputSchema,
        annotations: WRITES_FILE,
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const result = await service.execute(
              { cacheable: false, signal: extra.signal },
              (ctx) =>
                downloadOperation(ctx, {
                  url: args.url,
                  kind: 'audio',
                  audioFormat: args.audioFormat,
                }),
            );
            return {
              text: `Downloaded audio: ${result.path} (${result.format}, ${result.bytes} bytes)`,
              structuredContent: { ...result },
            };
          },
          {
            errorPrefix: 'Error downloading audio',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
