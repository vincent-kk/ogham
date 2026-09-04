import { existsSync, mkdtempSync, rmSync } from 'node:fs';

import {
  ensureDirectorySync,
  portableDirname,
  portableJoin,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
  spawnCliSync,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_FILE_NAMES,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import { readPreparedReviewState } from './reviewState/helpers/readPreparedReviewState.js';
import { readReviewStateFixtureJson } from './reviewState/helpers/readReviewStateFixtureJson.js';
import { resolveReviewArtifactFromDirectory } from './reviewState/helpers/resolveReviewArtifactFromDirectory.js';
import { writeReviewRulePluginFile } from './reviewState/helpers/writeReviewRulePluginFile.js';

/** Temporary repository exercised by the prepare contract tests. */
let projectRoot: string;

/** Temporary plugin root containing a deliberately small review-rule map. */
let fixturePluginRoot: string;

/** Host plugin-root value restored after each isolated test. */
let originalPluginRoot: string | undefined;

/** Branch name used by every fixture repository. */
const BRANCH = 'feature/prepare-v7';

/**
 * Execute Git inside the current fixture repository.
 *
 * @param args Git arguments excluding the executable name.
 * @returns Standard output with trailing line endings removed.
 * @throws When Git exits unsuccessfully or cannot be spawned.
 */
function git(args: readonly string[]): string {
  const result = spawnCliSync('git', args, { cwd: projectRoot });
  if (result.code !== 0 || result.spawnError)
    throw new Error(result.stderr || result.spawnError?.message);
  return result.stdout.trimEnd();
}

/**
 * Write one project-relative fixture file atomically.
 *
 * @param relativePath Project-relative destination below the fixture root.
 * @param content Complete UTF-8 fixture content.
 * @returns Nothing.
 */
function writeProjectFile(relativePath: string, content: string): void {
  const filePath = resolveContainedPath(projectRoot, relativePath);
  ensureDirectorySync(portableDirname(filePath));
  writeFileAtomicallySync(filePath, content);
}

beforeEach(() => {
  originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  fixturePluginRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-plugin-'));
  process.env.CLAUDE_PLUGIN_ROOT = fixturePluginRoot;
  writeReviewRulePluginFile(
    fixturePluginRoot,
    'skills/cross-review/rules/rules.json',
    `${JSON.stringify({
      schema_version: 1,
      rules: [
        { id: 'default', always: true, file: 'default.md' },
        {
          id: 'ecmascript',
          match: ['**/*.ts'],
          file: 'lang/ecmascript.md',
        },
      ],
    })}\n`,
  );
  writeReviewRulePluginFile(
    fixturePluginRoot,
    'skills/cross-review/rules/default.md',
    '# Default review rule\n',
  );
  writeReviewRulePluginFile(
    fixturePluginRoot,
    'skills/cross-review/rules/lang/ecmascript.md',
    '# ECMAScript review rule\n',
  );

  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-prepare-'));
  git(['init', '-b', 'main']);
  git(['config', 'user.email', 'filid@example.test']);
  git(['config', 'user.name', 'Filid Test']);
  writeProjectFile(
    '.filid/config.json',
    `${JSON.stringify({
      version: '2.0',
      language: 'English',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      structure: { generatedPaths: ['generated'] },
      review: {
        effort: 'low',
        concurrency: 2,
        groupFileLimit: 8,
        groupChurnLimit: 200,
        planChurnLimit: 100,
        lockfiles: ['package-lock.json'],
      },
    })}\n`,
  );
  writeProjectFile(
    'INTENT.md',
    '# Fixture\n\n## Purpose\n\nTest fixture.\n\n## Conventions\n\n- Keep deterministic.\n\n## Boundaries\n\n### Always do\n\n- Test.\n\n### Ask first\n\n- Contract changes.\n\n### Never do\n\n- Publish.\n',
  );
  writeProjectFile(
    'DETAIL.md',
    '# Fixture contract\n\n## Requirements\n\n- Stay deterministic.\n\n## API Contracts\n\n- None.\n\n## Acceptance Criteria\n\n### AC-fixture\n\n- The fixture loads.\n\n## Last Updated\n\n2026-09-04\n',
  );
  writeProjectFile(
    'index.ts',
    "export { modified } from './src/modified.js';\n",
  );
  writeProjectFile('src/modified.ts', "export const modified = 'base';\n");
  writeProjectFile('src/deleted.ts', "export const deleted = 'base';\n");
  writeProjectFile('generated/output.js', 'base generated\n');
  writeProjectFile('package-lock.json', '{"lockfileVersion":3}\n');
  git(['add', '--all']);
  git(['commit', '-m', 'base']);
  git(['checkout', '-b', BRANCH]);
  writeProjectFile(
    'src/modified.ts',
    "export const modified = 'feature';\nexport const extra = true;\n",
  );
  rmSync(resolveContainedPath(projectRoot, 'src/deleted.ts'));
  writeProjectFile('src/added.ts', "export const added = 'feature';\n");
  writeProjectFile('generated/output.js', 'feature generated\n');
  writeProjectFile(
    'package-lock.json',
    '{"lockfileVersion":3,"packages":{}}\n',
  );
  git(['add', '--all']);
  git(['commit', '-m', 'feature prepare']);
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(fixturePluginRoot, { recursive: true, force: true });
  if (originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
});

describe('review_state prepare v7', () => {
  it('creates evidence, session, diffs, briefs, skeletons, groups, and state', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(result.status).toBe('ok');
    expect(result.summary).toMatchObject({
      disposition: REVIEW_STATE_DISPOSITIONS.FRESH,
      filesTotal: 5,
      unitsTotal: 2,
      groupsTotal: 1,
      effort: 'low',
      concurrency: 2,
    });
    expect(Object.keys(result.summary).sort()).toEqual(
      [
        'action',
        'candidateCount',
        'concurrency',
        'disposition',
        'effort',
        'evidenceComplete',
        'filesTotal',
        'groupsTotal',
        'snapshotHash',
        'sourceHash',
        'unitsTotal',
        'worktree',
      ].sort(),
    );
    expect(Object.keys(result.data).sort()).toEqual(
      [
        'candidates',
        'dirtyPaths',
        'evidencePath',
        'files',
        'groups',
        'infoCount',
        'outOfScopeCount',
        'reviewDirectory',
        'sessionPath',
        'statePath',
        'statuses',
      ].sort(),
    );
    expect(result.summary).not.toHaveProperty('verdict');
    expect(result.data.groups).toHaveLength(1);
    expect(readUtf8FileIfExistsSync(result.data.evidencePath ?? '')).toContain(
      'review_schema: 7',
    );
    expect(readUtf8FileIfExistsSync(result.data.sessionPath ?? '')).toContain(
      '## Review Checklist',
    );
    const group = result.data.groups?.[0];
    expect(group).toBeDefined();
    expect(
      group?.units.every(({ diffPath }) =>
        existsSync(
          resolveReviewArtifactFromDirectory(
            result.data.reviewDirectory,
            diffPath,
          ),
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolveReviewArtifactFromDirectory(
          result.data.reviewDirectory,
          group?.briefPath ?? '',
        ),
      ),
    ).toBe(true);
    expect(
      readReviewStateFixtureJson(
        resolveReviewArtifactFromDirectory(
          result.data.reviewDirectory,
          group?.skeletonPath ?? '',
        ),
      ),
    ).toMatchObject({
      schema: 7,
      group: '01',
      round: 1,
      state: 'INDETERMINATE',
    });
    expect(readReviewStateFixtureJson(result.data.statePath)).toMatchObject({
      schemaVersion: 2,
      effort: 'low',
      phase: 'prepared',
    });

    writeProjectFile(
      '.filid/config.json',
      `${JSON.stringify({
        version: '2.0',
        language: 'English',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        review: { concurrency: 0 },
      })}\n`,
    );
    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.PREPARE,
        projectRoot,
        branchName: BRANCH,
        baseRef: 'main',
      }),
    ).rejects.toThrow('config validation failed');
  });

  it('keeps skipped roster entries visible while excluding them from units', async () => {
    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(result.data.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'src/deleted.ts',
          skipReason: 'deleted path',
        }),
        expect.objectContaining({
          path: 'generated/output.js',
          role: 'generated',
        }),
        expect.objectContaining({
          path: 'package-lock.json',
          role: 'lockfile',
        }),
      ]),
    );
    expect(
      result.data.groups?.flatMap(({ units }) => units.map(({ path }) => path)),
    ).toEqual(['src/added.ts', 'src/modified.ts']);
    const session =
      readUtf8FileIfExistsSync(result.data.sessionPath ?? '') ?? '';
    expect(session).toContain('generated/output.js');
    expect(session).toContain('package-lock.json');
    expect(session).toContain('deleted path');
  });

  it('restores a prepared state and writes only missing artifacts', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    const group = prepared.data.groups?.[0];
    if (!group) throw new Error('Expected a prepared review group');
    const opinionPath = resolveReviewArtifactFromDirectory(
      prepared.data.reviewDirectory,
      group.opinionPath,
    );
    const missingDiff = resolveReviewArtifactFromDirectory(
      prepared.data.reviewDirectory,
      group.units[0]?.diffPath ?? '',
    );
    writeFileAtomicallySync(opinionPath, '{"sentinel":true}\n');
    rmSync(missingDiff);
    rmSync(prepared.data.sessionPath ?? '');
    const stateBefore = readUtf8FileIfExistsSync(prepared.data.statePath);

    const resumed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(resumed.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    );
    expect(readUtf8FileIfExistsSync(opinionPath)).toBe('{"sentinel":true}\n');
    expect(existsSync(missingDiff)).toBe(true);
    expect(existsSync(resumed.data.sessionPath ?? '')).toBe(true);
    expect(readUtf8FileIfExistsSync(prepared.data.statePath)).toBe(stateBefore);
  });

  it('restores complete prepared artifacts without reopening rule sources', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    rmSync(fixturePluginRoot, { recursive: true, force: true });

    const resumed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(resumed.status).toBe('ok');
    expect(resumed.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    );
    expect(readPreparedReviewState(resumed)).toEqual(
      readPreparedReviewState(prepared),
    );
  });

  it('restores a missing session without reopening rule sources', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    rmSync(prepared.data.sessionPath ?? '');
    rmSync(fixturePluginRoot, { recursive: true, force: true });

    const resumed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(resumed.status).toBe('ok');
    expect(resumed.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    );
    expect(existsSync(resumed.data.sessionPath ?? '')).toBe(true);
    expect(readPreparedReviewState(resumed)).toEqual(
      readPreparedReviewState(prepared),
    );
  });

  it('recomputes missing evidence without overwriting existing opinions', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    const opinionPath = resolveReviewArtifactFromDirectory(
      prepared.data.reviewDirectory,
      prepared.data.groups?.[0]?.opinionPath ?? '',
    );
    writeFileAtomicallySync(opinionPath, '{"kept":true}\n');
    rmSync(prepared.data.evidencePath ?? '');

    const resumed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(resumed.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.RESUMABLE,
    );
    expect(existsSync(resumed.data.evidencePath ?? '')).toBe(true);
    expect(readUtf8FileIfExistsSync(opinionPath)).toBe('{"kept":true}\n');
  });

  it('force starts fresh and removes stale review opinions', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    const staleOpinion = resolveReviewArtifactFromDirectory(
      prepared.data.reviewDirectory,
      'opinions/stale.json',
    );
    writeFileAtomicallySync(staleOpinion, '{}\n');

    const forced = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      force: true,
    });

    expect(forced.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(existsSync(staleOpinion)).toBe(false);
  });

  it('cleans orphan artifacts when no canonical state exists', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    const orphan = resolveReviewArtifactFromDirectory(
      prepared.data.reviewDirectory,
      'opinions/orphan.json',
    );
    writeFileAtomicallySync(orphan, '{}\n');
    rmSync(prepared.data.statePath);

    const refreshed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(refreshed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(existsSync(orphan)).toBe(false);
    expect(existsSync(refreshed.data.statePath)).toBe(true);
  });

  it('treats a version-one state as fresh without requiring force', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    writeFileAtomicallySync(
      prepared.data.statePath,
      `${JSON.stringify({ schemaVersion: 1 })}\n`,
    );

    const refreshed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(refreshed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(
      readReviewStateFixtureJson(refreshed.data.statePath).schemaVersion,
    ).toBe(2);
  });

  it('restores a sealed matching review without rewriting artifacts', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    const state = readReviewStateFixtureJson(prepared.data.statePath);
    writeFileAtomicallySync(
      prepared.data.statePath,
      `${JSON.stringify({
        ...state,
        phase: 'sealed',
        sealedAt: '2026-09-04T00:00:00.000Z',
        verdict: 'APPROVED',
      })}\n`,
    );
    writeFileAtomicallySync(
      resolveReviewArtifactFromDirectory(
        prepared.data.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.REPORT,
      ),
      '# Review report\n',
    );
    writeFileAtomicallySync(
      prepared.data.sessionPath ?? '',
      'session sentinel\n',
    );

    const cached = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(cached.summary).toMatchObject({
      disposition: REVIEW_STATE_DISPOSITIONS.CACHED,
      verdict: 'APPROVED',
    });
    expect(cached.data.groups).toEqual(prepared.data.groups);
    expect(readUtf8FileIfExistsSync(prepared.data.sessionPath ?? '')).toBe(
      'session sentinel\n',
    );
  });

  it('does not cache a sealed state whose report is missing', async () => {
    const prepared = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    const state = readReviewStateFixtureJson(prepared.data.statePath);
    writeFileAtomicallySync(
      prepared.data.statePath,
      `${JSON.stringify({
        ...state,
        phase: 'sealed',
        sealedAt: '2026-09-04T00:00:00.000Z',
        verdict: 'APPROVED',
      })}\n`,
    );

    const refreshed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(refreshed.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(readReviewStateFixtureJson(refreshed.data.statePath).phase).toBe(
      'prepared',
    );
  });

  it('uses a changed effort as a fresh review identity', async () => {
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      effort: 'low',
    });

    const changed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
      effort: 'high',
    });

    expect(changed.summary).toMatchObject({
      disposition: REVIEW_STATE_DISPOSITIONS.FRESH,
      effort: 'high',
    });
    expect(changed.data.groups?.[0]?.rounds).toBe(3);
  });

  it('materializes a completed candidate-only group for skipped changes', async () => {
    writeProjectFile(
      '.filid/config.json',
      `${JSON.stringify({
        version: '2.0',
        language: 'English',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        structure: {
          generatedPaths: ['generated', 'src', '.filid/config.json'],
        },
        review: { effort: 'low', lockfiles: ['package-lock.json'] },
      })}\n`,
    );
    writeProjectFile('generated/INTENT.md', '# Invalid generated contract\n');
    git(['add', '--all']);
    git(['commit', '-m', 'candidate-only change']);

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(result.data.groups).toEqual([
      expect.objectContaining({
        id: '01',
        units: [],
        rounds: 0,
        validated: {
          review: expect.objectContaining({ round: 0, complete: true }),
          verify: null,
        },
      }),
    ]);
    const group = result.data.groups?.[0];
    expect(
      readReviewStateFixtureJson(
        resolveReviewArtifactFromDirectory(
          result.data.reviewDirectory,
          group?.opinionPath ?? '',
        ),
      ),
    ).toMatchObject({ state: 'COMPLETE', files: [], findings: [] });
    expect(
      existsSync(
        resolveReviewArtifactFromDirectory(
          result.data.reviewDirectory,
          group?.verifyBriefPath ?? '',
        ),
      ),
    ).toBe(true);
  });

  it('uses unique diff filenames for equal basenames in one group', async () => {
    writeProjectFile('one/index.ts', 'export const one = true;\n');
    writeProjectFile('two/index.ts', 'export const two = true;\n');
    git(['add', '--all']);
    git(['commit', '-m', 'same basename sources']);

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });
    const paths =
      result.data.groups?.flatMap(({ units }) =>
        units.map(({ diffPath }) => diffPath),
      ) ?? [];

    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.filter((path) => path.includes('index.ts'))).toHaveLength(2);
  });

  it('reports generated-only dirt while still creating review artifacts', async () => {
    writeProjectFile('generated/untracked.js', 'generated dirt\n');

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot,
      branchName: BRANCH,
      baseRef: 'main',
    });

    expect(result.status).toBe('ok');
    expect(result.summary.worktree).toBe('generated-only');
    expect(result.data.dirtyPaths).toEqual(['generated/untracked.js']);
    expect(existsSync(result.data.sessionPath ?? '')).toBe(true);
  });
});
