import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  FilidConfigSchema,
  loadConfig,
} from '../../../../core/infra/configLoader/index.js';

/** Minimal valid configuration shared by the review configuration checks. */
const BASE_CONFIG = {
  version: '2.0',
  adapters: { mode: 'auto', enabled: ['ecmascript'] },
  rules: {},
} as const;

describe('review configuration', () => {
  it.each([
    ['groupChurnLimit', 0],
    ['groupChurnLimit', -1],
    ['groupChurnLimit', 1.5],
    ['groupFileLimit', 0],
    ['groupFileLimit', -1],
    ['groupFileLimit', 1.5],
    ['planChurnLimit', 0],
    ['planChurnLimit', -1],
    ['planChurnLimit', 1.5],
    ['concurrency', 0],
    ['concurrency', -1],
    ['concurrency', 1.5],
  ])('rejects %s=%s at the review field', (field, value) => {
    /** Result retained so the failing schema path can be asserted. */
    const parsed = FilidConfigSchema.safeParse({
      ...BASE_CONFIG,
      review: { [field]: value },
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['review', field] }),
        ]),
      );
  });

  it('deduplicates lockfiles in first-seen order', () => {
    /** Isolated project root for exercising the public loader path. */
    const projectRoot = mkdtempSync(join(tmpdir(), 'filid-review-config-'));

    try {
      mkdirSync(join(projectRoot, '.filid'));
      writeFileSync(
        join(projectRoot, '.filid', 'config.json'),
        JSON.stringify({
          ...BASE_CONFIG,
          review: {
            lockfiles: [
              'yarn.lock',
              'package-lock.json',
              'yarn.lock',
              'pnpm-lock.yaml',
              'package-lock.json',
            ],
          },
        }),
        'utf8',
      );

      expect(loadConfig(projectRoot).config?.review?.lockfiles).toEqual([
        'yarn.lock',
        'package-lock.json',
        'pnpm-lock.yaml',
      ]);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
