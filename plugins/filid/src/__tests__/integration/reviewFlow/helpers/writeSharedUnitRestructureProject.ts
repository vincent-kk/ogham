import { mkdtempSync } from 'node:fs';

import { portableJoin, tmp } from '@ogham/cross-platform';

import { writeReviewStateFixtureFile } from '../../../unit/mcp/reviewState/helpers/writeReviewStateFixtureFile.js';

import { FIXTURE_INTENT } from './reviewFlowRepositoryFiles.js';

/** Valid DETAIL.md with one acceptance group, shared by every fractal. */
const DETAIL =
  '# Fixture contract\n\n## Requirements\n\n- Keep the value deterministic.\n\n## API Contracts\n\n- The entry point exports the value.\n\n## Acceptance Criteria\n\n### AC-fixture — Value export\n\n- The value is exported.\n\n## Last Updated\n\n2026-09-07\n';

/** Project files: `domain/a/value.ts` is consumed by `domain/a` and `domain/b`. */
const PROJECT_FILES: Readonly<Record<string, string>> = {
  'INTENT.md': FIXTURE_INTENT,
  'DETAIL.md': DETAIL,
  'index.ts': "export { a, b } from './domain/index.js';\n",
  'domain/INTENT.md': FIXTURE_INTENT,
  'domain/DETAIL.md': DETAIL,
  'domain/index.ts':
    "export { a } from './a/index.js';\nexport { b } from './b/index.js';\n",
  'domain/a/INTENT.md': FIXTURE_INTENT,
  'domain/a/DETAIL.md': DETAIL,
  'domain/a/index.ts': "export { a } from './use.js';\n",
  'domain/a/use.ts':
    "import { value } from './value.js';\n\nexport const a = value + 1;\n",
  'domain/a/value.ts': 'export const value = 1;\n',
  'domain/b/INTENT.md': FIXTURE_INTENT,
  'domain/b/DETAIL.md': DETAIL,
  'domain/b/index.ts': "export { b } from './use.js';\n",
  'domain/b/use.ts':
    "import { value } from '../a/value.js';\n\nexport const b = value + 2;\n",
};

/**
 * Write an FCA project whose one shared unit belongs at the `domain` fractal.
 * @param config Optional `.filid/config.json` value; omitted means no config file.
 * @returns Absolute temporary project root.
 */
export function writeSharedUnitRestructureProject(
  config?: Readonly<Record<string, unknown>>,
): string {
  const projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-restructure-'));
  for (const [path, content] of Object.entries(PROJECT_FILES))
    writeReviewStateFixtureFile(projectRoot, path, content);
  if (config)
    writeReviewStateFixtureFile(
      projectRoot,
      '.filid/config.json',
      JSON.stringify(config),
    );
  return projectRoot;
}
