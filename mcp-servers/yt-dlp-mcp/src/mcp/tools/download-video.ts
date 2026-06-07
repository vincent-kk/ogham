import { z } from 'zod';

import { downloadOperation } from '../../ytdlp/operations/download.js';
import { handleToolExecution } from '../handle.js';
import type { ToolDefinition } from '../tool-definition.js';

import { WRITES_FILE } from './annotations.js';

const TIME_RE = /^\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/;

const inputSchema = {
  url: z.string().describe('Full video URL.'),
  resolution: z
    .enum(['480p', '720p', '1080p', 'best'])
    .optional()
    .describe('Preferred quality (default 720p).'),
  startTime: z
    .string()
    .regex(TIME_RE)
    .optional()
    .describe('Trim start HH:MM:SS[.ms] (requires ffmpeg).'),
  endTime: z
    .string()
    .regex(TIME_RE)
    .optional()
    .describe('Trim end HH:MM:SS[.ms] (requires ffmpeg).'),
};

const description = `Download a video file into the downloads directory.

Args: url; resolution ('480p'|'720p'|'1080p'|'best'); startTime/endTime for trimming (HH:MM:SS, needs ffmpeg).
Returns: the saved file path plus structuredContent { path, bytes, format }.
Note: writes a file; not idempotent. Trimming and some merges require ffmpeg on PATH.`;

export const downloadVideoTool: ToolDefinition = {
  name: 'ytdlp_download_video',
  enabledBy: 'download',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_download_video',
      {
        title: 'Download video',
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
                  kind: 'video',
                  resolution: args.resolution,
                  startTime: args.startTime,
                  endTime: args.endTime,
                }),
            );
            return {
              text: `Downloaded video: ${result.path} (${result.format}, ${result.bytes} bytes)`,
              structuredContent: { ...result },
            };
          },
          {
            errorPrefix: 'Error downloading video',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
