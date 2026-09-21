import type { PinnedReviewRepositoryFiles } from './createPinnedReviewRepository.js';

/** Valid INTENT.md body shared by every fixture fractal. */
export const FIXTURE_INTENT =
  '## Purpose\n\nOwn the fixture module.\n\n## Conventions\n\n- Keep deterministic.\n\n## Boundaries\n\n### Always do\n\n- Preserve the contract.\n\n### Ask first\n\n- Change the boundary.\n\n### Never do\n\n- Publish artifacts.\n';

/** DETAIL.md body shared by every fixture fractal. */
const FIXTURE_DETAIL =
  '# Fixture contract\n\n## Requirements\n\n- Keep the value deterministic.\n\n## API Contracts\n\n- The entry point exports the value.\n\n## Acceptance Criteria\n\n### AC-fixture\n\n- The value is exported.\n\n## Last Updated\n\n2026-09-07\n';

/** Non-FCA repository: one changed source and one skipped lockfile, no FCA candidates. */
export const PLAIN_REVIEW_REPOSITORY: PinnedReviewRepositoryFiles = {
  base: {
    'src/value.ts': 'export const value = 1;\n',
    'yarn.lock': 'base-lock\n',
  },
  feature: {
    'src/value.ts': 'export const value = 2;\n',
    'yarn.lock': 'feature-lock\n',
  },
};

/**
 * FCA repository whose two changed fractals, `src/alpha` and `src/beta`, each lack INTENT.md,
 * so prepare numbers two candidates: FCA-001 for alpha and FCA-002 for beta.
 */
export const INTENT_GAP_REVIEW_REPOSITORY: PinnedReviewRepositoryFiles = {
  base: {
    'INTENT.md': FIXTURE_INTENT,
    'DETAIL.md': FIXTURE_DETAIL,
    'index.ts':
      "export { alpha } from './src/alpha/index.js';\nexport { beta } from './src/beta/index.js';\n",
    'src/alpha/DETAIL.md': FIXTURE_DETAIL,
    'src/alpha/index.ts': 'export const alpha = 1;\n',
    'src/beta/DETAIL.md': FIXTURE_DETAIL,
    'src/beta/index.ts': 'export const beta = 1;\n',
  },
  feature: {
    'src/alpha/index.ts': 'export const alpha = 2;\n',
    'src/beta/index.ts': 'export const beta = 2;\n',
  },
};
