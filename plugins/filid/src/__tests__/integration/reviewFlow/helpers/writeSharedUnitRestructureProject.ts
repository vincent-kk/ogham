import { writeReviewStateFixtureFile } from '../../../unit/mcp/reviewState/helpers/writeReviewStateFixtureFile.js';

import { createFixtureProjectRoot } from '../../helpers/createFixtureProjectRoot.js';
import { seedFacts } from '../../helpers/seedFacts.js';

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
 * The project is given its facts here: analysis reads the facts store, so a
 * fixture without records is one filid can draw no reference-based conclusion
 * about, and a test built on it would assert the absence of facts instead.
 *
 * @returns Absolute temporary project root.
 */
export async function writeSharedUnitRestructureProject(
  config?: Readonly<Record<string, unknown>>,
): Promise<string> {
  const projectRoot = createFixtureProjectRoot('filid-restructure-');
  for (const [path, content] of Object.entries(PROJECT_FILES))
    writeReviewStateFixtureFile(projectRoot, path, content);
  if (config)
    writeReviewStateFixtureFile(
      projectRoot,
      '.filid/config.json',
      JSON.stringify(config),
    );
  await seedFacts(projectRoot);
  return projectRoot;
}
