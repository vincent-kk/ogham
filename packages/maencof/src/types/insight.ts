import { z } from 'zod';

// ─── Configuration ──────────────────────────────────────────────────

export const InsightConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sensitivity: z.enum(['high', 'medium', 'low']).default('medium'),
  max_captures_per_session: z.number().int().min(0).default(10),
  notify: z.boolean().default(true),
});

export type InsightConfig = z.infer<typeof InsightConfigSchema>;

export const DEFAULT_INSIGHT_CONFIG: InsightConfig = {
  enabled: true,
  sensitivity: 'medium',
  max_captures_per_session: 10,
  notify: true,
};

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

export const DEFAULT_INSIGHT_STATS: InsightStats = {
  total_captured: 0,
  l2_direct: 0,
  l5_captured: 0,
  l5_promoted: 0,
  l5_archived: 0,
  updatedAt: new Date().toISOString(),
};

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
