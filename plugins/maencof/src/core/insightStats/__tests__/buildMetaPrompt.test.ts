import { expect, it } from 'vitest';

import { DEFAULT_INSIGHT_CONFIG } from '../../../constants/insight.js';
import { buildMetaPrompt } from '../operations/buildMetaPrompt.js';

it('surfaces the configured allowlist alongside sensitivity and capture limit', () => {
  const prompt = buildMetaPrompt({
    ...DEFAULT_INSIGHT_CONFIG,
    sensitivity: 'low',
    max_captures_per_session: 4,
    category_filter: {
      principle: false,
      refuted_premise: true,
      ephemeral_candidate: false,
    },
  });
  expect(prompt).toContain('allowed-categories="refuted_premise"');
  expect(prompt).toContain('sensitivity="low" max="4"');
});

it('represents an empty allowlist without substituting default categories', () => {
  const prompt = buildMetaPrompt({
    ...DEFAULT_INSIGHT_CONFIG,
    category_filter: {
      principle: false,
      refuted_premise: false,
      ephemeral_candidate: false,
    },
  });
  expect(prompt).toContain('allowed-categories=""');
});
