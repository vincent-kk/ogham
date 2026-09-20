import { rmSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { seedFacts } from '../../../integration/helpers/seedFacts.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { prepareWithFacts } from './helpers/prepareWithFacts.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

/** The code a review uses to say which of its files references did not judge. */
const CODE = 'review-files-outside-facts-scope';

let fixture: ReviewStateSealFixture;

afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/**
 * Commit two more source files, one of them outside the given facts scope.
 * @param covers What the project declares as its facts scope, or undefined.
 */
async function commitTwoFiles(covers?: readonly string[]): Promise<void> {
  writeReviewStateFixtureFile(fixture.projectRoot, '.git/info/exclude', '.filid/\n');
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    '.filid/config.json',
    JSON.stringify({
      version: '2.0',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      review: { groupFileLimit: 2 },
      ...(covers === undefined ? {} : { facts: { covers: [...covers] } }),
    }),
  );
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    'src/kept/value.ts',
    'export const kept = 1;\n',
  );
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    'src/other/thing.ts',
    'export const other = 1;\n',
  );
  runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-m', 'two files']);
  await seedFacts(fixture.projectRoot);
}

/**
 * Prepare the fixture and return the codes of its scope diagnostics.
 * @returns One entry per diagnostic prepare recorded.
 */
async function prepareCodes(): Promise<{ code: string; message: string }[]> {
  const prepared = await prepareWithFacts({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    effort: 'low',
  });
  return (prepared.diagnostics ?? []).map(({ code, message }) => ({
    code,
    message,
  }));
}

describe('a review says which of its files references did not judge', () => {
  it('names the changed files the declared facts scope leaves out', async () => {
    fixture = await createReviewStateSealFixture();
    await commitTwoFiles(['src/kept/**']);

    const diagnostics = await prepareCodes();

    const reported = diagnostics.find(({ code }) => code === CODE);
    expect(reported).toBeDefined();
    expect(reported?.message).toContain('src/other/thing.ts');
    // The scope is the project's own declaration, so this does not block: it
    // says what was skipped, which `unsupported` alone would leave silent.
    expect(reported?.message).not.toContain('src/kept/value.ts');
  }, 300_000);

  it('says nothing when every changed file is in scope', async () => {
    fixture = await createReviewStateSealFixture();
    await configureReviewGroups(fixture.projectRoot, 1);
    await commitTwoFiles();

    const diagnostics = await prepareCodes();

    expect(diagnostics.map(({ code }) => code)).not.toContain(CODE);
  }, 300_000);

  it('repeats the line in the response that publishes the verdict', async () => {
    fixture = await createReviewStateSealFixture();
    await commitTwoFiles(['src/kept/**']);
    await prepareCodes();
    await completeIncrementalReview(fixture.projectRoot);

    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    // The verdict answers for files reference rules never judged; the response
    // that publishes it has to say so too, not only the prepared evidence.
    expect((sealed.diagnostics ?? []).map(({ code }) => code)).toContain(CODE);
    expect(sealed.summary.verdict).toBe('APPROVED');
  }, 300_000);
});
