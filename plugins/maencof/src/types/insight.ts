import { z } from 'zod';

// ─── Configuration ──────────────────────────────────────────────────

export const InsightCategoryFilterSchema = z
  .object({
    principle: z.boolean().default(true),
    refuted_premise: z.boolean().default(false),
    ephemeral_candidate: z.boolean().default(false),
  })
  .default({
    principle: true,
    refuted_premise: false,
    ephemeral_candidate: false,
  });

export type InsightCategoryFilter = z.infer<typeof InsightCategoryFilterSchema>;

export const InsightConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sensitivity: z.enum(['high', 'medium', 'low']).default('medium'),
  max_captures_per_session: z.number().int().min(0).default(10),
  notify: z.boolean().default(true),
  category_filter: InsightCategoryFilterSchema,
});

export type InsightConfig = z.infer<typeof InsightConfigSchema>;

export { DEFAULT_INSIGHT_CONFIG } from '../constants/insight.js';

// ─── MCP Tool Input ─────────────────────────────────────────────────

export interface CaptureInsightInput {
  title: string;
  content: string;
  layer: 2 | 5;
  tags: string[];
  context?: string;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface InsightStats {
  total_captured: number;
  l2_direct: number;
  l5_captured: number;
  l5_promoted: number;
  l5_archived: number;
  updatedAt: string;
}

export { DEFAULT_INSIGHT_STATS } from '../constants/insight.js';

// ─── Pending Notification ───────────────────────────────────────────

export interface PendingInsightCapture {
  path: string;
  title: string;
  layer: 2 | 5;
}

export interface PendingInsightNotification {
  captures: PendingInsightCapture[];
  sessionId: string;
  createdAt: string;
}
