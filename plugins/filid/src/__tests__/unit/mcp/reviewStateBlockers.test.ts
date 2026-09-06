import { mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';

import {
  readUtf8FileIfExistsSync,
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_FILE_NAMES,
  REVIEW_STATE_PHASES,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './reviewState/helpers/buildReviewOpinion.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './reviewState/helpers/createReviewStateSealFixture.js';
import { prepareReviewBlockerFixture } from './reviewState/helpers/prepareReviewBlockerFixture.js';
import { prepareReviewStateSealFixture } from './reviewState/helpers/prepareReviewStateSealFixture.js';
import { validateReviewStateSealGroup } from './reviewState/helpers/validateReviewStateSealGroup.js';

/** Temporary repository and plugin root used by the active case. */
let fixture: ReviewStateSealFixture;

beforeEach(() => {
  fixture = createReviewStateSealFixture();
});

afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('review blocker artifact lifecycle', () => {
  it('seals a fresh INCONCLUSIVE review with one identity-bound blocker report', async () => {
    const prepared = await prepareReviewBlockerFixture(fixture);
    const blockersPath = resolveContainedPath(
      prepared.paths.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.BLOCKERS,
    );

    const sealed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    expect(sealed.status).toBe('ok');
    expect(sealed.summary).toMatchObject({
      verdict: 'INCONCLUSIVE',
      confirmed: 0,
      refuted: 0,
      indeterminate: 0,
    });
    expect(sealed.data).toHaveProperty('blockersPath', blockersPath);
    expect(readUtf8FileIfExistsSync(prepared.paths.reportPath)).toContain(
      'blockers_report: review-blockers.md',
    );
    expect(readUtf8FileIfExistsSync(blockersPath)).toContain(
      'Does the project dependency graph contain a cycle?',
    );
  });

  it('reuses sealed blocker bytes through seal, prepare, and checkpoint', async () => {
    const prepared = await prepareReviewBlockerFixture(fixture);
    const blockersPath = resolveContainedPath(
      prepared.paths.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.BLOCKERS,
    );
    const first = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    const blockerBytes = readUtf8FileIfExistsSync(blockersPath);
    expect(blockerBytes).not.toBeNull();
    const preserved = new Map([
      [
        prepared.paths.statePath,
        readFileSync(prepared.paths.statePath, 'utf8'),
      ],
      [
        prepared.paths.reportPath,
        readFileSync(prepared.paths.reportPath, 'utf8'),
      ],
      [blockersPath, blockerBytes!],
      [
        prepared.paths.prCommentPath,
        readFileSync(prepared.paths.prCommentPath, 'utf8'),
      ],
      [
        prepared.paths.sessionPath,
        readFileSync(prepared.paths.sessionPath, 'utf8'),
      ],
    ]);
    writeFileAtomicallySync(
      resolveContainedPath(
        prepared.paths.reviewDirectory,
        prepared.state.groups[0]!.opinionPath,
      ),
      'mutated after seal\n',
    );

    const repeated = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    const cached = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
    });
    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    expect(first.data).toHaveProperty('blockersPath', blockersPath);
    expect(repeated.data).toHaveProperty('blockersPath', blockersPath);
    expect(cached.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.CACHED);
    expect(checkpoint.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.CACHED,
    );
    for (const [path, bytes] of preserved)
      expect(readFileSync(path, 'utf8')).toBe(bytes);
  });

  it('reads a current-policy report without the new marker as immutable legacy', async () => {
    const prepared = await prepareReviewBlockerFixture(fixture);
    const blockersPath = resolveContainedPath(
      prepared.paths.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.BLOCKERS,
    );
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    const legacyReport = readFileSync(
      prepared.paths.reportPath,
      'utf8',
    ).replace('blockers_report: review-blockers.md\n', '');
    writeFileAtomicallySync(prepared.paths.reportPath, legacyReport);
    rmSync(blockersPath, { force: true });
    const preservedState = readFileSync(prepared.paths.statePath, 'utf8');
    const preservedSession = readFileSync(prepared.paths.sessionPath, 'utf8');

    const repeated = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    const cached = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
    });
    const checkpoint = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.CHECKPOINT,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    expect(repeated.data).toHaveProperty('blockersPath', null);
    expect(cached.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.CACHED);
    expect(checkpoint.summary.disposition).toBe(
      REVIEW_STATE_DISPOSITIONS.CACHED,
    );
    expect(readFileSync(prepared.paths.reportPath, 'utf8')).toBe(legacyReport);
    expect(readFileSync(prepared.paths.statePath, 'utf8')).toBe(preservedState);
    expect(readFileSync(prepared.paths.sessionPath, 'utf8')).toBe(
      preservedSession,
    );
    expect(readUtf8FileIfExistsSync(blockersPath)).toBeNull();
  });

  it('returns null and removes a stale blocker file for a conclusive seal', async () => {
    const state = await prepareReviewStateSealFixture(fixture);
    const group = state.groups[0]!;
    const validated = await validateReviewStateSealGroup({
      fixture,
      state,
      opinion: buildReviewOpinion(state, group),
      decisions: [],
    });
    const blockersPath = resolveContainedPath(
      validated.projectRoot,
      '.filid/review',
      validated.normalizedBranch,
      REVIEW_STATE_FILE_NAMES.BLOCKERS,
    );
    writeFileAtomicallySync(blockersPath, 'stale blocker report\n');

    const sealed = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    expect(sealed.summary.verdict).toBe('APPROVED');
    expect(sealed.data).toHaveProperty('blockersPath', null);
    expect(readUtf8FileIfExistsSync(blockersPath)).toBeNull();
  });

  it.each([
    REVIEW_STATE_ACTIONS.PREPARE,
    REVIEW_STATE_ACTIONS.CHECKPOINT,
    REVIEW_STATE_ACTIONS.SEAL,
  ] as const)(
    'refuses %s when a marked blocker artifact is missing without rewriting the seal',
    async (action) => {
      const prepared = await prepareReviewBlockerFixture(fixture);
      const blockersPath = resolveContainedPath(
        prepared.paths.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.BLOCKERS,
      );
      await handleReviewState({
        action: REVIEW_STATE_ACTIONS.SEAL,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      });
      rmSync(blockersPath, { force: true });
      const preservedState = readFileSync(prepared.paths.statePath, 'utf8');
      const preservedReport = readFileSync(prepared.paths.reportPath, 'utf8');
      const request = {
        action,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        ...(action === REVIEW_STATE_ACTIONS.PREPARE ? { baseRef: 'main' } : {}),
      };

      if (action === REVIEW_STATE_ACTIONS.PREPARE)
        await expect(handleReviewState(request)).rejects.toMatchObject({
          code: REVIEW_STATE_DIAGNOSTIC_CODES.BLOCKERS_MISSING,
        });
      else {
        const result = await handleReviewState(request);
        expect(result.status).toBe('indeterminate');
        expect(result.summary.disposition).toBe(
          REVIEW_STATE_DISPOSITIONS.STALE,
        );
        expect(result.diagnostics).toContainEqual(
          expect.objectContaining({
            code: REVIEW_STATE_DIAGNOSTIC_CODES.BLOCKERS_MISSING,
            path: blockersPath,
          }),
        );
      }
      expect(readFileSync(prepared.paths.statePath, 'utf8')).toBe(
        preservedState,
      );
      expect(readFileSync(prepared.paths.reportPath, 'utf8')).toBe(
        preservedReport,
      );
    },
  );

  it.each([
    ['schema', 'blockers', /^blockers_schema: .*$/mu, 'blockers_schema: 2'],
    [
      'source identity',
      'blockers',
      /^source_hash: .*$/mu,
      'source_hash: "other"',
    ],
    [
      'snapshot identity',
      'blockers',
      /^snapshot_hash: .*$/mu,
      'snapshot_hash: "other"',
    ],
    ['branch identity', 'blockers', /^branch: .*$/mu, 'branch: "other"'],
    ['verdict identity', 'blockers', /^verdict: .*$/mu, 'verdict: APPROVED'],
    [
      'duplicate metadata',
      'blockers',
      'blockers_schema: 1',
      'blockers_schema: 1\nblockers_schema: 1',
    ],
    [
      'non-canonical marker',
      'report',
      'blockers_report: review-blockers.md',
      'blockers_report: ../elsewhere.md',
    ],
  ] as const)(
    'rejects invalid blocker %s metadata from checkpoint',
    async (_name, artifact, pattern, replacement) => {
      const prepared = await prepareReviewBlockerFixture(fixture);
      const blockersPath = resolveContainedPath(
        prepared.paths.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.BLOCKERS,
      );
      await handleReviewState({
        action: REVIEW_STATE_ACTIONS.SEAL,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      });
      const target =
        artifact === 'report' ? prepared.paths.reportPath : blockersPath;
      const original =
        readUtf8FileIfExistsSync(target) ??
        [
          '---',
          'blockers_schema: 1',
          `source_hash: ${JSON.stringify(prepared.state.sourceHash)}`,
          `snapshot_hash: ${JSON.stringify(prepared.state.scope.snapshotHash)}`,
          `branch: ${JSON.stringify(prepared.state.branchName)}`,
          'verdict: INCONCLUSIVE',
          '---',
          '',
          '# Review blockers — INCONCLUSIVE',
          '',
        ].join('\n');
      writeFileAtomicallySync(target, original.replace(pattern, replacement));
      const preserved = readFileSync(target, 'utf8');

      const checkpoint = await handleReviewState({
        action: REVIEW_STATE_ACTIONS.CHECKPOINT,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      });

      expect(checkpoint.status).toBe('indeterminate');
      expect(checkpoint.summary.disposition).toBe(
        REVIEW_STATE_DISPOSITIONS.STALE,
      );
      expect(checkpoint.diagnostics).toContainEqual(
        expect.objectContaining({
          code: REVIEW_STATE_DIAGNOSTIC_CODES.BLOCKERS_INVALID,
          path:
            artifact === 'report' ? prepared.paths.reportPath : blockersPath,
        }),
      );
      expect(readFileSync(target, 'utf8')).toBe(preserved);
    },
  );

  it.each([
    REVIEW_STATE_ACTIONS.PREPARE,
    REVIEW_STATE_ACTIONS.CHECKPOINT,
    REVIEW_STATE_ACTIONS.SEAL,
  ] as const)(
    'checks validation policy before blocker compatibility during %s',
    async (action) => {
      const prepared = await prepareReviewBlockerFixture(fixture);
      const blockersPath = resolveContainedPath(
        prepared.paths.reviewDirectory,
        REVIEW_STATE_FILE_NAMES.BLOCKERS,
      );
      await handleReviewState({
        action: REVIEW_STATE_ACTIONS.SEAL,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      });
      const state = JSON.parse(
        readFileSync(prepared.paths.statePath, 'utf8'),
      ) as Record<string, unknown>;
      delete state.validationPolicyVersion;
      writeFileAtomicallySync(
        prepared.paths.statePath,
        `${JSON.stringify(state, null, 2)}\n`,
      );
      rmSync(blockersPath, { force: true });

      await expect(
        handleReviewState({
          action,
          projectRoot: fixture.projectRoot,
          branchName: fixture.branchName,
          ...(action === REVIEW_STATE_ACTIONS.PREPARE
            ? { baseRef: 'main' }
            : {}),
        }),
      ).rejects.toMatchObject({ code: 'review-validation-policy-outdated' });
    },
  );

  it('rejects a symlinked blocker artifact without reading its external target', async () => {
    const prepared = await prepareReviewBlockerFixture(fixture);
    const blockersPath = resolveContainedPath(
      prepared.paths.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.BLOCKERS,
    );
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    rmSync(blockersPath, { force: true });
    const externalPath = resolveContainedPath(
      fixture.projectRoot,
      'outside-review-blockers.md',
    );
    writeFileAtomicallySync(externalPath, 'external target\n');
    symlinkSync(externalPath, blockersPath);

    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.CHECKPOINT,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      }),
    ).rejects.toThrow();
    expect(readFileSync(externalPath, 'utf8')).toBe('external target\n');
  });

  it('keeps state prepared when writing the blocker artifact fails', async () => {
    const prepared = await prepareReviewBlockerFixture(fixture);
    const blockersPath = resolveContainedPath(
      prepared.paths.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.BLOCKERS,
    );
    mkdirSync(blockersPath);

    await expect(
      handleReviewState({
        action: REVIEW_STATE_ACTIONS.SEAL,
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
      }),
    ).rejects.toThrow();
    expect(
      JSON.parse(readFileSync(prepared.paths.statePath, 'utf8')),
    ).toMatchObject({ phase: REVIEW_STATE_PHASES.PREPARED, verdict: null });
  });

  it('removes a sealed blocker artifact only during an explicit fresh prepare', async () => {
    const prepared = await prepareReviewBlockerFixture(fixture);
    const blockersPath = resolveContainedPath(
      prepared.paths.reviewDirectory,
      REVIEW_STATE_FILE_NAMES.BLOCKERS,
    );
    await handleReviewState({
      action: REVIEW_STATE_ACTIONS.SEAL,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });
    expect(readUtf8FileIfExistsSync(blockersPath)).not.toBeNull();

    const forced = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.PREPARE,
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      force: true,
    });

    expect(forced.summary.disposition).toBe(REVIEW_STATE_DISPOSITIONS.FRESH);
    expect(readUtf8FileIfExistsSync(blockersPath)).toBeNull();
  });
});
