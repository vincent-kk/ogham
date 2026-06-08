import { z } from 'zod';

import type { Heatmap } from '@/domain/types.js';
import { formatTimestamp } from '@/postprocess/format-timestamp.js';
import { cacheKey } from '@/utils/cache-key.js';
import { heatmapOperation } from '@/ytdlp/operations/heatmap.js';

import { READ_ONLY } from './utils/annotations.js';
import { handleToolExecution } from './utils/handle.js';
import type { ToolDefinition } from './utils/tool-definition.js';

const inputSchema = {
  url: z.string().describe('Full video URL.'),
};

const description = `Get the most-replayed heatmap (engagement score per time span).
Returns: scored spans + structuredContent { videoId, spans }.
Use when finding a video's popular moments. Empty list when no heatmap is available.`;

function render(result: Heatmap): string {
  if (result.spans.length === 0) return `No heatmap for ${result.videoId}.`;
  const top = [...result.spans].sort((a, b) => b.score - a.score).slice(0, 10);
  const lines = top.map(
    (s) =>
      `${formatTimestamp(s.startMs)}–${formatTimestamp(s.endMs)}  score ${s.score.toFixed(3)}`,
  );
  return `# Most replayed (top ${top.length})\n\n${lines.join('\n')}`;
}

export const heatmapTool: ToolDefinition = {
  name: 'ytdlp_get_heatmap',
  enabledBy: 'heatmap',
  register(server, { service, config }) {
    server.registerTool(
      'ytdlp_get_heatmap',
      {
        title: 'Get heatmap',
        description,
        inputSchema,
        annotations: READ_ONLY,
      },
      async (args, extra) =>
        handleToolExecution(
          async () => {
            const result = await service.execute(
              {
                cacheKey: cacheKey('heatmap', args.url),
                cacheable: true,
                signal: extra.signal,
              },
              (ctx) => heatmapOperation(ctx, { url: args.url }),
            );
            return { text: render(result), structuredContent: { ...result } };
          },
          {
            errorPrefix: 'Error fetching heatmap',
            characterLimit: config.extraction.characterLimit,
          },
        ),
    );
  },
};
