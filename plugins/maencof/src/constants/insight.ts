import type { InsightConfig, InsightStats } from '../types/insight.js';

export const DEFAULT_INSIGHT_CONFIG: InsightConfig = {
  enabled: true,
  sensitivity: 'medium',
  max_captures_per_session: 10,
  notify: true,
  category_filter: {
    principle: true,
    refuted_premise: false,
    ephemeral_candidate: false,
  },
};

export const DEFAULT_INSIGHT_STATS: InsightStats = {
  total_captured: 0,
  l2_direct: 0,
  l5_captured: 0,
  l5_promoted: 0,
  l5_archived: 0,
  updatedAt: new Date().toISOString(),
};

export const PENDING_FILE = 'pending-insight-notification.json';

export const SENSITIVITY_CRITERIA: Record<string, string> = {
  high: 'all opinions, experiences, discoveries, questions, conclusions, analogies, judgments. When in doubt, capture.',
  medium:
    'conclusions, deep experiences, significant discoveries, explicit judgments. Skip: simple opinions, incomplete questions, casual remarks.',
  low: 'only verified experience+conclusion pairs, established principles, major discoveries. Skip most.',
};
