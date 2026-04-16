import { z } from 'zod';

import {
  appendPendingCapture,
  getSessionCaptureCount,
  incrementInsightStats,
  readInsightConfig,
} from '../../../core/insight-stats/index.js';
import type { InsightCategoryFilter } from '../../../types/insight.js';
import type { MaencofCrudResult } from '../../../types/mcp.js';

import { handleMaencofCreate } from '../maencof-create/index.js';

/** Capture-insight category — maps to InsightCategoryFilter keys. */
export const InsightCategoryEnum = z
  .enum(['principle', 'refuted_premise', 'ephemeral_candidate'])
  .describe(
    'Capture category — controls which config.category_filter flag gates this capture. ' +
      'principle (default, accept on by default), refuted_premise (rejected Socratic premise, default reject), ' +
      'ephemeral_candidate (discarded ToT candidate, default reject).',
  );

export type InsightCategory = z.infer<typeof InsightCategoryEnum>;

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
  category: InsightCategoryEnum.optional(),
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
        message: `Session capture limit (${config.max_captures_per_session}) reached. Use /maencof:maencof-insight --max N to increase.`,
      };
    }
  }

  // 1.5. Check category_filter — reject if the requested category is not allowed
  const category: keyof InsightCategoryFilter = args.category ?? 'principle';
  if (config.category_filter[category] === false) {
    return {
      success: false,
      path: '',
      message: `Category "${category}" is rejected by config.category_filter. Use /maencof:maencof-insight --category ${categoryFlag(category)} --accept to allow.`,
    };
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

/**
 * Map an internal category key to the user-facing `--category` flag value
 * used by `/maencof:maencof-insight`.
 */
function categoryFlag(category: keyof InsightCategoryFilter): string {
  switch (category) {
    case 'principle':
      return 'principle';
    case 'refuted_premise':
      return 'refuted';
    case 'ephemeral_candidate':
      return 'ephemeral';
  }
}
