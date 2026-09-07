import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';

/** Disposable Git history exercises real prepare, validation and sealing. */
let fixture: ReviewStateSealFixture;
beforeEach(() => {
  fixture = createReviewStateSealFixture();
  configureReviewGroups(fixture.projectRoot, 2);
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/**
 * Supply the host's explicit instruction catalog to the real prepare action.
 * @param userInstructions Ordered host text; empty means explicitly no rules.
 * @param changeContext Untrusted pull-request context rendered into each brief.
 * @returns The live prepare payload, with no mocked evidence collector.
 */
function prepare(
  userInstructions = '',
  changeContext = 'Review the assigned changes.',
) {
  return handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    effort: 'low',
    changeContext,
    userInstructions,
  });
}

describe('incremental prepare lifecycle', () => {
  it('reopens changed judgment inputs while preserving sealed origin artifacts', async () => {
    const first = await prepare();
    const completed = await completeIncrementalReview(fixture.projectRoot);
    const state = completed.data.state!;
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(sealed.summary.disposition).toBe('sealed');
    const reportPath = sealed.data.reportPath!;
    const report = readFileSync(reportPath, 'utf8');
    const opinionPath = join(
      first.data.reviewDirectory,
      state.groups[0].opinionPath,
    );
    const opinion = readFileSync(opinionPath, 'utf8');
    const next = await prepare('USR-001: Check all error paths explicitly.');
    expect(next.data.reviewDirectory).not.toBe(first.data.reviewDirectory);
    expect(next.summary).toMatchObject({ reusedGroups: 0, rerunGroups: 2 });
    expect(next.data.next).toHaveLength(2);
    expect(
      JSON.parse(readFileSync(next.data.statePath, 'utf8')).verdict,
    ).toBeNull();
    expect(readFileSync(reportPath, 'utf8')).toBe(report);
    expect(readFileSync(opinionPath, 'utf8')).toBe(opinion);
  });

  it('preserves core reviewer sections when untrusted change context reassembles the incremental marker', async () => {
    const marker = '\n<!-- filid:incremental-context -->\n';
    const changeContext =
      marker + '<!-- filid:incremental-context -->\n' + 'REST';
    await prepare('', changeContext);

    const next = await prepare(
      'FIX-006: Inspect the appended context.',
      changeContext,
    );
    const brief = readFileSync(
      join(next.data.reviewDirectory, next.data.groups[0].briefPath),
      'utf8',
    );

    expect(brief).toContain('REST');
    expect(brief).toContain('FIX-006: Inspect the appended context.');
    expect(brief).toContain('## Files');
    expect(brief).toContain('## Diffs');
  });

  it('keeps in-progress generation paths when observed inputs are unchanged', async () => {
    const first = await prepare();
    const next = await prepare();
    expect(next.data.reviewDirectory).toBe(first.data.reviewDirectory);
    expect(next.summary.disposition).toBe('resumable');
    expect(next.data.next.map((handoff) => handoff.outputPath)).toEqual(
      first.data.next.map((handoff) => handoff.outputPath),
    );
  });

  it('ignores an ordinary untracked .filid file during progress', async () => {
    writeFileSync(
      join(fixture.projectRoot, '.git/info/exclude'),
      '.filid/config.json\n.filid/review/\n',
    );
    await prepare();
    writeFileSync(
      join(fixture.projectRoot, '.filid/local-note.txt'),
      'uncommitted input\n',
    );
    await expect(
      handleReviewState({
        action: 'checkpoint',
        projectRoot: fixture.projectRoot,
      }),
    ).resolves.toHaveProperty('data.state');
    const next = await prepare();
    expect(next.data.files.map((file) => file.path)).not.toContain(
      '.filid/local-note.txt',
    );
    expect(next.data.reviewDirectory).toBeDefined();
  });

  it('ignores a dirty path added beyond the bounded response list', async () => {
    for (let index = 0; index < 20; index += 1)
      writeFileSync(
        join(
          fixture.projectRoot,
          `local-${String(index).padStart(2, '0')}.txt`,
        ),
        'existing dirty input\n',
      );
    const prepared = await prepare();
    expect(prepared.data.dirtyPaths).toHaveLength(20);
    writeFileSync(
      join(fixture.projectRoot, 'zz-late-dirty-input.txt'),
      'late dirty input\n',
    );
    await expect(
      handleReviewState({
        action: 'checkpoint',
        projectRoot: fixture.projectRoot,
      }),
    ).resolves.toHaveProperty('data.state');
  });

  it('reruns sealed groups when the canonical review rule body changes', async () => {
    await prepare();
    await completeIncrementalReview(fixture.projectRoot);
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    writeFileSync(
      join(fixture.pluginRoot, 'skills/cross-review/rules/default.md'),
      '# Updated review rule\n',
    );
    const next = await prepare();
    expect(next.summary).toMatchObject({ reusedGroups: 0, rerunGroups: 2 });
    expect(next.data.next).toHaveLength(2);
  });

  it('ignores unrelated agent metadata changes', async () => {
    const actorDirectory = join(fixture.pluginRoot, 'agents');
    const bridgeDirectory = join(fixture.pluginRoot, 'bridge');
    mkdirSync(actorDirectory, { recursive: true });
    mkdirSync(bridgeDirectory, { recursive: true });
    const actorPath = join(actorDirectory, 'review-actor.md');
    writeFileSync(actorPath, '# Actor version 1\n');
    writeFileSync(
      join(bridgeDirectory, 'guard-review-actor.mjs'),
      'export const guardVersion = 1;\n',
    );
    await prepare();
    await completeIncrementalReview(fixture.projectRoot);
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    writeFileSync(actorPath, '# Actor version 2\n');
    const next = await prepare();
    expect(next.summary.disposition).toBe('cached');
    expect(next.data.next).toEqual([]);
  });

  it.each([
    ['canonical hook registration', 'hooks/hooks.json'],
    ['shared hook runner', 'libs/run.cjs'],
  ])('ignores unrelated %s changes', async (_label, relativePath) => {
    const runtimePath = join(fixture.pluginRoot, relativePath);
    mkdirSync(dirname(runtimePath), { recursive: true });
    writeFileSync(runtimePath, 'runtime version 1\n');
    await prepare();
    await completeIncrementalReview(fixture.projectRoot);
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    writeFileSync(runtimePath, 'runtime version 2\n');
    const next = await prepare();
    expect(next.summary.disposition).toBe('cached');
    expect(next.data.next).toEqual([]);
  });
});
