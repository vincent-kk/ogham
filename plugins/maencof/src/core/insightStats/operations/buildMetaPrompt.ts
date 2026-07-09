/**
 * @file buildMetaPrompt.ts
 * @description Build the auto-insight meta-prompt XML from config values.
 */
import { SENSITIVITY_CRITERIA } from '../../../constants/insight.js';
import type { InsightConfig } from '../../../types/insight.js';

/**
 * Build meta-prompt XML from config values.
 * No disk file — prompt is generated in memory.
 */
export function buildMetaPrompt(config: InsightConfig): string {
  const criteria =
    SENSITIVITY_CRITERIA[config.sensitivity] ?? SENSITIVITY_CRITERIA.medium;
  return `<auto-insight enabled="${config.enabled}" sensitivity="${config.sensitivity}" max="${config.max_captures_per_session}">
Detect user insights. Call capture_insight on detection. No confirmation.
Notify: 💡 Insight recorded to L{layer}: "{title}"

${config.sensitivity}: ${criteria}

L2=validated conclusions/principles L5=impressions/questions/exploratory
Ignore: tool requests, file ops, builds, acks, greetings, slash commands.
</auto-insight>`;
}
