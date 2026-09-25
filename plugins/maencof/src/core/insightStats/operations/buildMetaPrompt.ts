/**
 * @file buildMetaPrompt.ts
 * @description Build the auto-insight meta-prompt XML from config values.
 */
import { SENSITIVITY_CRITERIA } from '../../../constants/insight.js';
import type { InsightConfig } from '../../../types/insight.js';

/**
 * Format capture routing and the allowlist from validated configuration.
 * @param config Capture settings; no vault I/O is performed.
 * @returns Session policy with sensitivity criteria and allowed categories.
 */
export function buildMetaPrompt(config: InsightConfig): string {
  const criteria =
    SENSITIVITY_CRITERIA[config.sensitivity] ?? SENSITIVITY_CRITERIA.medium;
  const allowed = Object.entries(config.category_filter)
    .filter(([, accepted]) => accepted)
    .map(([category]) => category)
    .join(',');
  return `<auto-insight enabled="${config.enabled}" sensitivity="${config.sensitivity}" max="${config.max_captures_per_session}" allowed-categories="${allowed}">
Use the insight skill: search and read related accounts before capture. Skip unchanged claims; preserve novel evidence, conditions and exceptions. Use capture_insight without repeated confirmation for eligible novel captures. Never bypass a rejection through create/update. Multi-document consolidation uses organize --insights.
Notify: 💡 Insight recorded to L{layer}: "{title}"

${config.sensitivity}: ${criteria}

L2=validated conclusions/principles L5=impressions/questions/exploratory
Ignore: tool requests, file ops, builds, acks, greetings, slash commands.
</auto-insight>`;
}
