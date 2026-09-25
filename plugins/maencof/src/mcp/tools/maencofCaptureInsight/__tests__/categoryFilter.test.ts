import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it } from 'vitest';

import { DEFAULT_INSIGHT_CONFIG } from '../../../../constants/insight.js';
import { writeInsightConfig } from '../../../../core/insightStats/index.js';
import { handleCaptureInsight } from '../maencofCaptureInsight.js';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'insight-category-'));
  writeInsightConfig(root, {
    ...DEFAULT_INSIGHT_CONFIG,
    category_filter: {
      principle: false,
      refuted_premise: false,
      ephemeral_candidate: false,
    },
  });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

it.each(['principle', 'refuted_premise', 'ephemeral_candidate'] as const)(
  'rejects %s without creating knowledge, stats or pending notifications',
  async (category) => {
    const result = await handleCaptureInsight(root, {
      title: 'Synthetic insight',
      content: 'Synthetic claim.',
      tags: ['testing'],
      layer: 2,
      category,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('rejected by config.category_filter');
    expect(await readdir(root)).toEqual(['.maencof-meta']);
    expect(
      existsSync(join(root, '.maencof-meta/auto-insight-stats.json')),
    ).toBe(false);
    expect(
      existsSync(join(root, '.maencof-meta/pending-insight-notification.json')),
    ).toBe(false);
  },
);

it('defaults an omitted category to principle and honors its rejection', async () => {
  const result = await handleCaptureInsight(root, {
    title: 'Synthetic insight',
    content: 'Synthetic claim.',
    tags: ['testing'],
    layer: 5,
  });
  expect(result.success).toBe(false);
  expect(await readdir(root)).toEqual(['.maencof-meta']);
});
