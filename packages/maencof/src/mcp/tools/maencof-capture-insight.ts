import { z } from 'zod';

import {
  appendPendingCapture,
  getSessionCaptureCount,
  incrementInsightStats,
  readInsightConfig,
} from '../../core/insight-stats.js';
import type { MaencofCrudResult } from '../../types/mcp.js';

import { handleMaencofCreate } from './maencof-create.js';

export const captureInsightInputSchema = z.object({
  title: z.string().describe('Concise title summarizing the insight'),
  content: z.string().describe('Insight content in markdown format'),
  layer: z
    .literal(2)
    .or(z.literal(5))
    .describe('Target layer (2=Derived, 5=Context)'),
  tags: z
    .array(z.string())
    .min(1)
    .describe('Topic tags (auto-insight tag is auto-added)'),
  context: z
    .string()
    .optional()
    .describe('Brief conversation context that triggered this insight'),
});

export type CaptureInsightArgs = z.infer<typeof captureInsightInputSchema>;

export async function handleCaptureInsight(
  vaultPath: string,
  args: CaptureInsightArgs,
  sessionId?: string,
): Promise<MaencofCrudResult> {
  // 1. Check session capture limit
  const config = readInsightConfig(vaultPath);
  if (config.max_captures_per_session > 0) {
    const count = getSessionCaptureCount(vaultPath);
    if (count >= config.max_captures_per_session) {
      return {
        success: false,
        path: '',
        message: `Session capture limit (${config.max_captures_per_session}) reached. Use /maencof:insight --max N to increase.`,
      };
    }
  }

  // 2. Auto-inject auto-insight tag
  const tags = args.tags.includes('auto-insight')
    ? args.tags
    : ['auto-insight', ...args.tags];

  // 3. Build content with optional context section
  let fullContent = args.content;
  if (args.context) {
    fullContent = `## Context\n\n${args.context}\n\n${fullContent}`;
  }

  // 4. Delegate to existing create handler
  const result = await handleMaencofCreate(vaultPath, {
    layer: args.layer as 2 | 5,
    tags,
    content: fullContent,
    title: args.title,
  });

  // 5. Post-capture bookkeeping (only on success)
  if (result.success) {
    incrementInsightStats(vaultPath, args.layer as 2 | 5);
    appendPendingCapture(
      vaultPath,
      { path: result.path, title: args.title, layer: args.layer as 2 | 5 },
      sessionId ?? 'unknown',
    );
  }

  return result;
}
