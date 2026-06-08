import { z } from 'zod';

import {
  dedupeAdjacent,
  stripCaptionArtifacts,
} from '../../postprocess/ad-stripper.js';
import { segmentsToText } from '../../postprocess/segments-to-text.js';
import { cacheKey } from '../../utils/cache-key.js';
import { transcriptOperation } from '../../ytdlp/operations/transcript.js';

import { handleToolExecution } from './handle.js';
import type { ToolDefinition } from './tool-definition.js';

const inputSchema = {
  url: z
    .string()
    .describe('Full video URL (YouTube or any yt-dlp-supported site).'),
  language: z
    .string()
    .regex(
      /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/,
      'Use a language code like "en", "ko", or "pt-BR".',
    )
    .optional()
    .describe(
      "BCP-47-ish language code, e.g. 'en', 'ko', 'ja'. Falls back to 'en'.",
    ),
  timestamps: z
    .boolean()
    .optional()
    .describe('Prefix each line with [H:MM:SS]. Default false (clean prose).'),
  stripArtifacts: z
    .boolean()
    .optional()
    .describe(
      'Drop [Music]/[Applause] cues and rolling-caption duplicates. Default false.',
    ),
};

const description = `Download a clean plain-text transcript from a video's captions.

Args:
  - url (string): full video URL.
  - language (string, optional): caption language code (default 'en'); falls back to <lang>-orig then en.
  - timestamps (boolean, optional): prefix each line with [H:MM:SS] (default false).
  - stripArtifacts (boolean, optional): remove non-speech cues and duplicate caption lines (default false).

Returns: the transcript text plus structuredContent { videoId, language, availableSubs, segmentCount, metadata }.

Use when: you need readable text for analysis, summary, or quoting.
Don't use when: you need timestamped raw subtitles (enable ytdlp_get_video_subtitles) or a media file.

Errors: NO_CAPTIONS (no captions in any fallback language), VIDEO_UNAVAILABLE, BLOCKED, INVALID_INPUT.`;

export const transcriptTool: ToolDefinition = {
  name: 'ytdlp_download_transcript',
  enabledBy: 'default',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_download_transcript',
      {
        title: 'Download transcript',
        description,
        inputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const language = args.language ?? 'en';
            const result = await service.execute(
              {
                cacheKey: cacheKey('transcript', args.url, { language }),
                cacheable: true,
                signal: extra.signal,
              },
              (ctx) => transcriptOperation(ctx, { url: args.url, language }),
            );

            let segments = result.segments;
            if (args.stripArtifacts) {
              segments = dedupeAdjacent(segments)
                .map((s) => ({ ...s, text: stripCaptionArtifacts(s.text) }))
                .filter((s) => s.text.length > 0);
            }

            const body = segmentsToText(segments, {
              timestamps: args.timestamps ?? false,
            });
            const header = `# ${result.metadata.title}\n${result.metadata.channel} · ${result.language}`;
            return {
              text: `${header}\n\n${body}`,
              structuredContent: {
                videoId: result.videoId,
                language: result.language,
                availableSubs: result.availableSubs,
                segmentCount: segments.length,
                metadata: result.metadata,
              },
            };
          },
          {
            errorPrefix: 'Error downloading transcript',
            characterLimit: config.extraction.maxTranscriptLength,
          },
        ),
    );
  },
};
