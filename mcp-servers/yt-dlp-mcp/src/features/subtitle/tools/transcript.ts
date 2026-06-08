import { z } from 'zod';

import { handleToolExecution } from '@/mcp/tools/utils/handle.js';
import type { ToolDefinition } from '@/mcp/tools/utils/tool-definition.js';
import { cacheKey } from '@/utils/cache-key.js';

import { transcriptOperation } from '../operations/transcript.js';
import {
  dedupeAdjacent,
  stripCaptionArtifacts,
} from '../postprocess/ad-stripper.js';
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
      "Caption language (e.g. 'en', 'ko'). Defaults to YTDLP_DEFAULT_SUB_LANG ('en' if unset); also tries <lang>-orig.",
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
Returns: transcript text + structuredContent { videoId, language, availableSubs, segmentCount, charCount, truncated, warnings, metadata }.
Use when you need readable text to analyze, summarize, or quote; not for timestamped raw cues (enable ytdlp_get_video_subtitles) or a media file.`;

export const transcriptTool: ToolDefinition = {
  name: 'ytdlp_download_transcript',
  enabledBy: 'transcript',
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
            const language = args.language ?? config.extraction.defaultSubLang;
            const result = await service.execute(
              {
                cacheKey: cacheKey('transcript', args.url, { language }),
                cacheable: true,
                signal: extra.signal,
                throttle: 'subtitle',
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
            const text = `${header}\n\n${body}`;
            const limit = config.extraction.maxTranscriptLength;
            return {
              text,
              structuredContent: {
                videoId: result.videoId,
                language: result.language,
                availableSubs: result.availableSubs,
                segmentCount: segments.length,
                charCount: text.length,
                truncated: text.length > limit,
                warnings: result.warnings,
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
