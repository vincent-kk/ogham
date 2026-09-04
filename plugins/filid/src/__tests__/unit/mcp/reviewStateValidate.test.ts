import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';

import {
  portableJoin,
  readUtf8FileIfExistsSync,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
} from 'vitest';

import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_FILE_NAMES,
} from '../../../constants/reviewState.js';
import { handleReviewState } from '../../../mcp/tools/reviewState/index.js';
import type {
  ReviewEffort,
  ReviewPreparePayload,
  ReviewSealPayload,
  ReviewStateRecord,
  ReviewValidatePayload,
} from '../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './reviewState/helpers/buildReviewOpinion.js';
import { buildVerifyOpinion } from './reviewState/helpers/buildVerifyOpinion.js';
import { commitReviewStateFixture } from './reviewState/helpers/commitReviewStateFixture.js';
import { createReviewRulePluginRoot } from './reviewState/helpers/createReviewRulePluginRoot.js';
import { prepareReviewStateFixture } from './reviewState/helpers/prepareReviewStateFixture.js';
import { readPersistedReviewState } from './reviewState/helpers/readPersistedReviewState.js';
import { resolveReviewStateFixtureArtifact } from './reviewState/helpers/resolveReviewStateFixtureArtifact.js';
import { roundReviewOpinionPath } from './reviewState/helpers/roundReviewOpinionPath.js';
import { runReviewStateFixtureGit } from './reviewState/helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './reviewState/helpers/writeReviewStateFixtureFile.js';
import { writeReviewStateFixtureJson } from './reviewState/helpers/writeReviewStateFixtureJson.js';

/** Source branch shared by every validation fixture. */
const BRANCH = 'feature/validate-v7';

/** Temporary repository exercised by validation tests. */
let projectRoot: string;

/** Temporary plugin root containing the minimal review-rule map. */
let fixturePluginRoot: string;

/** Host plugin-root value restored after each test. */
let originalPluginRoot: string | undefined;

/**
 * Prepare state for the current validation fixture.
 *
 * @param effort Optional reviewer round budget for the fixture.
 * @returns Canonical persisted state after prepare completes.
 */
function prepareState(effort?: ReviewEffort): Promise<ReviewStateRecord> {
  return prepareReviewStateFixture(projectRoot, BRANCH, effort);
}

/**
 * Resolve one artifact for the current validation fixture.
 *
 * @param state Prepared state carrying the collision-safe branch directory.
 * @param relativePath Review-directory-relative artifact path.
 * @returns Absolute contained fixture artifact path.
 */
function artifactPath(state: ReviewStateRecord, relativePath: string): string {
  return resolveReviewStateFixtureArtifact(
    projectRoot,
    state.normalizedBranch,
    relativePath,
  );
}

beforeEach(() => {
  originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  fixturePluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = fixturePluginRoot;
  projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-validate-'));
  runReviewStateFixtureGit(projectRoot, ['init', '-b', 'main']);
  runReviewStateFixtureGit(projectRoot, [
    'config',
    'user.email',
    'filid@example.test',
  ]);
  runReviewStateFixtureGit(projectRoot, ['config', 'user.name', 'Filid Test']);
  writeReviewStateFixtureFile(
    projectRoot,
    'src/value.ts',
    'export const value = 1;\n',
  );
  commitReviewStateFixture(projectRoot, 'base');
  runReviewStateFixtureGit(projectRoot, ['checkout', '-b', BRANCH]);
  writeReviewStateFixtureFile(
    projectRoot,
    'src/value.ts',
    'export const value = 2;\n',
  );
  commitReviewStateFixture(projectRoot, 'feature');
});

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(fixturePluginRoot, { recursive: true, force: true });
  if (originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
});

describe('review_state validate v7', () => {
  it('returns a missing disposition when no prepared state exists', async () => {
    expectTypeOf<
      Extract<ReviewValidatePayload, { summary: { kind: 'review' } }>
    >().toMatchTypeOf<{
      summary: { disposition: 'validated'; round: number };
      data: { opinionPath: string; verifyBriefPath: string };
    }>();
    expectTypeOf<
      Extract<ReviewValidatePayload, { summary: { kind: 'verify' } }>
    >().toMatchTypeOf<{
      summary: { disposition: 'validated'; indeterminate: number };
      data: { verifyPath: string };
    }>();
    expectTypeOf<
      ReviewPreparePayload['summary']['disposition']
    >().toEqualTypeOf<'fresh' | 'resumable' | 'cached'>();
    expectTypeOf<
      ReviewSealPayload['summary']['disposition']
    >().toEqualTypeOf<'sealed'>();

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.VALIDATE,
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: '01',
      round: 1,
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary.disposition).toBe('missing');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_MISSING,
      }),
    );
  });

  it('returns a schema-mismatch diagnostic for an obsolete state record', async () => {
    const state = await prepareState();
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      REVIEW_STATE_FILE_NAMES.STATE,
      {
        ...state,
        schemaVersion: 1,
      },
    );

    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: '01',
      round: 1,
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary.disposition).toBe('missing');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_SCHEMA_MISMATCH,
      }),
    );
  });

  it('returns stale when committed source no longer matches prepare', async () => {
    const state = await prepareState();
    writeReviewStateFixtureFile(
      projectRoot,
      'src/value.ts',
      'export const value = 3;\n',
    );
    commitReviewStateFixture(projectRoot, 'change after prepare');

    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: state.groups[0].id,
      round: 1,
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary.disposition).toBe('stale');
  });

  it('rejects unknown groups and invalid review or verify round shapes', async () => {
    const state = await prepareState();
    const group = state.groups[0].id;
    const requests = [
      [{ kind: 'review', group: '99', round: 1 }, 'group does not exist'],
      [{ kind: 'review', group, round: 0 }, 'round must be'],
      [{ kind: 'review', group }, 'round must be'],
      [{ kind: 'verify', group, round: 1 }, 'round is not allowed'],
    ] as const;

    for (const [request, message] of requests)
      await expect(
        handleReviewState({
          action: 'validate',
          projectRoot,
          branchName: BRANCH,
          ...request,
        }),
      ).rejects.toThrow(message);
  });

  it('returns indeterminate when the requested opinion artifact is missing', async () => {
    const state = await prepareState();
    rmSync(artifactPath(state, roundReviewOpinionPath(state.groups[0].id, 1)), {
      force: true,
    });
    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: state.groups[0].id,
      round: 1,
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary.disposition).toBe('validated');
    expect(Object.keys(result.data).sort()).toEqual(
      ['opinionPath', 'problems', 'verifyBriefPath'].sort(),
    );
    if (!('opinionPath' in result.data))
      throw new Error('review validation response omitted opinionPath');
    expect(result.data.opinionPath).toBe(
      artifactPath(state, state.groups[0].opinionPath),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.OPINION_INVALID,
      }),
    );
  });

  it('returns a validated indeterminate response for a missing verifier opinion', async () => {
    const state = await prepareState('low');
    const group = state.groups[0];
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      roundReviewOpinionPath(group.id, 1),
      buildReviewOpinion(state, group),
    );
    await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 1,
    });

    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'verify',
      group: group.id,
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary.disposition).toBe('validated');
    expect(Object.keys(result.data).sort()).toEqual(
      ['problems', 'verifyPath'].sort(),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.OPINION_INVALID,
      }),
    );
  });

  it('reports every review problem code without mutating state', async () => {
    const state = await prepareState();
    const group = state.groups[0];
    const statePath = artifactPath(state, REVIEW_STATE_FILE_NAMES.STATE);
    const originalState = readUtf8FileIfExistsSync(statePath);
    const finding = {
      id: `R${group.id}-001`,
      severity: 'error',
      category: 'bug',
      path: 'src/value.ts',
      existingCode: 'export const value = 2;',
      lines: 'unknown',
      rule: 'DEF-1',
      message: 'Defect.',
      evidence: 'src/value.ts:1',
      consequence: 'Failure.',
      recommendedAction: 'Correct it.',
    };
    const matrix = [
      ['parse-error', '{'],
      ['schema-mismatch', { ...buildReviewOpinion(state, group), schema: 6 }],
      [
        'source-hash-mismatch',
        {
          ...buildReviewOpinion(state, group),
          sourceHash: 'wrong',
        },
      ],
      ['file-missing', { ...buildReviewOpinion(state, group), files: [] }],
      [
        'file-unassigned',
        {
          ...buildReviewOpinion(state, group),
          files: [
            ...(buildReviewOpinion(state, group).files as unknown[]),
            {
              path: 'src/other.ts',
              change: 'M',
              chunk: null,
              result: 'reviewed',
              reason: null,
            },
          ],
        },
      ],
      [
        'result-invalid',
        {
          ...buildReviewOpinion(state, group),
          files: [
            {
              ...(buildReviewOpinion(state, group).files as object[])[0],
              result: 'pending',
            },
          ],
        },
      ],
      [
        'finding-id-invalid',
        {
          ...buildReviewOpinion(state, group),
          findings: [{ ...finding, id: 'bad' }],
        },
      ],
      [
        'enum-invalid',
        {
          ...buildReviewOpinion(state, group),
          state: 'UNKNOWN',
        },
      ],
      [
        'field-empty',
        {
          ...buildReviewOpinion(state, group),
          findings: [{ ...finding, message: '' }],
        },
      ],
      [
        'path-unassigned',
        {
          ...buildReviewOpinion(state, group),
          findings: [{ ...finding, path: 'src/other.ts' }],
        },
      ],
      [
        'gap-required',
        {
          ...buildReviewOpinion(state, group),
          state: 'INDETERMINATE',
          gaps: [],
        },
      ],
    ] as const;

    for (const [code, opinion] of matrix) {
      const opinionPath = artifactPath(
        state,
        roundReviewOpinionPath(group.id, 1),
      );
      writeFileAtomicallySync(
        opinionPath,
        typeof opinion === 'string' ? opinion : `${JSON.stringify(opinion)}\n`,
      );
      const result = await handleReviewState({
        action: 'validate',
        projectRoot,
        branchName: BRANCH,
        kind: 'review',
        group: group.id,
        round: 1,
      });
      expect(result.data.problems).toContainEqual(
        expect.objectContaining({ code }),
      );
      expect(readUtf8FileIfExistsSync(statePath)).toBe(originalState);
    }
  });

  it('validates round one and writes the merged opinion and verifier handoff', async () => {
    const state = await prepareState();
    const group = state.groups[0];
    const opinion = buildReviewOpinion(state, group);
    opinion.findings = [
      {
        id: `R${group.id}-001`,
        severity: 'error',
        category: 'bug',
        path: 'src/value.ts',
        existingCode: 'export const value = 2;',
        lines: 'unknown',
        rule: 'DEF-1',
        message: 'The changed value is defective.',
        evidence: 'src/value.ts:1',
        consequence: 'The exported value is wrong.',
        recommendedAction: 'Restore the intended value.',
      },
    ];
    writeReviewStateFixtureFile(
      projectRoot,
      `.filid/review/${state.normalizedBranch}/opinions/review-${group.id}.r1.json`,
      `${JSON.stringify(opinion)}\n`,
    );

    const result = await handleReviewState({
      action: REVIEW_STATE_ACTIONS.VALIDATE,
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 1,
    });

    expect(result.summary).toMatchObject({
      disposition: 'validated',
      ok: true,
      findings: 1,
      newFindings: 1,
      nextRound: 2,
    });
    expect(
      JSON.parse(
        readUtf8FileIfExistsSync(artifactPath(state, group.opinionPath)) ?? '',
      ),
    ).toMatchObject({
      findings: [{ lines: '1-1', inDiff: true }],
    });
    expect(
      readUtf8FileIfExistsSync(artifactPath(state, group.verifyBriefPath)),
    ).toContain('## Decisions Required');
    expect(
      readUtf8FileIfExistsSync(
        artifactPath(state, REVIEW_STATE_FILE_NAMES.STATE),
      ),
    ).toContain('"validated"');
    expect(
      readUtf8FileIfExistsSync(
        artifactPath(state, roundReviewOpinionPath(group.id, 2)),
      ),
    ).not.toBeNull();
  });

  it('ends review early when a valid round introduces no findings', async () => {
    const state = await prepareState();
    const group = state.groups[0];
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      roundReviewOpinionPath(group.id, 1),
      buildReviewOpinion(state, group),
    );

    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 1,
    });

    expect(result.summary).toMatchObject({ ok: true, nextRound: null });
    expect(Object.keys(result.summary).sort()).toEqual(
      [
        'action',
        'disposition',
        'findings',
        'group',
        'kind',
        'newFindings',
        'nextRound',
        'ok',
        'problemCount',
        'round',
      ].sort(),
    );
    expect(Object.keys(result.data).sort()).toEqual(
      ['opinionPath', 'problems', 'verifyBriefPath'].sort(),
    );
    expect(
      readPersistedReviewState(projectRoot, state.normalizedBranch).groups[0]
        .validated.review,
    ).toMatchObject({
      round: 1,
      complete: true,
    });
  });

  it('merges a later round without duplicating an existing finding', async () => {
    const state = await prepareState();
    const group = state.groups[0];
    const firstFinding = {
      id: `R${group.id}-001`,
      severity: 'error',
      category: 'bug',
      path: 'src/value.ts',
      existingCode: 'export const value = 2;',
      lines: 'unknown',
      rule: 'DEF-1',
      message: 'First defect.',
      evidence: 'src/value.ts:1',
      consequence: 'First failure.',
      recommendedAction: 'Correct the first defect.',
    };
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      roundReviewOpinionPath(group.id, 1),
      {
        ...buildReviewOpinion(state, group),
        findings: [firstFinding],
      },
    );
    await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      roundReviewOpinionPath(group.id, 2),
      {
        ...buildReviewOpinion(state, group, 2),
        findings: [
          { ...firstFinding, id: `R${group.id}-777` },
          {
            ...firstFinding,
            id: `R${group.id}-778`,
            rule: 'DEF-2',
            message: 'Second defect.',
            consequence: 'Second failure.',
          },
        ],
      },
    );

    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 2,
    });

    expect(result.summary).toMatchObject({
      ok: true,
      findings: 2,
      newFindings: 1,
      nextRound: null,
    });
    const merged = JSON.parse(
      readUtf8FileIfExistsSync(artifactPath(state, group.opinionPath)) ?? '',
    ) as { findings: Array<{ id: string }> };
    expect(merged.findings).toHaveLength(2);
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      group.verifyPath,
      buildVerifyOpinion(
        state,
        group.id,
        merged.findings.map(({ id }) => ({
          findingId: id,
          verdict: 'REFUTED',
          evidence: 'The changed range does not reproduce the claimed failure.',
          reason: 'The finding is not supported by the committed source.',
        })),
      ),
    );
    const verified = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'verify',
      group: group.id,
    });
    expect(verified.summary.ok).toBe(true);
    expect(
      readPersistedReviewState(projectRoot, state.normalizedBranch).groups[0]
        .validated.verify,
    ).not.toBeNull();

    const revalidated = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 2,
    });
    expect(revalidated.summary.ok).toBe(true);
    expect(
      readPersistedReviewState(projectRoot, state.normalizedBranch).groups[0]
        .validated.verify,
    ).toBeNull();
  });

  it('rejects verify before review completion and reports decision mismatches', async () => {
    const state = await prepareState('low');
    const group = state.groups[0];
    await expect(
      handleReviewState({
        action: 'validate',
        projectRoot,
        branchName: BRANCH,
        kind: 'verify',
        group: group.id,
      }),
    ).rejects.toThrow('review validation must be complete');
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      REVIEW_STATE_FILE_NAMES.STATE,
      {
        ...state,
        groups: [
          {
            ...group,
            validated: {
              ...group.validated,
              review: { round: 1, sha256: 'incomplete', complete: false },
            },
          },
        ],
      },
    );
    await expect(
      handleReviewState({
        action: 'validate',
        projectRoot,
        branchName: BRANCH,
        kind: 'verify',
        group: group.id,
      }),
    ).rejects.toThrow('review validation must be complete');
    const finding = {
      id: `R${group.id}-001`,
      severity: 'warning',
      category: 'test',
      path: 'src/value.ts',
      existingCode: 'export const value = 2;',
      lines: 'unknown',
      rule: 'TST-1',
      message: 'Coverage is absent.',
      evidence: 'src/value.ts:1',
      consequence: 'Regression risk.',
      recommendedAction: 'Add coverage.',
    };
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      roundReviewOpinionPath(group.id, 1),
      {
        ...buildReviewOpinion(state, group),
        findings: [finding],
      },
    );
    await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      group.verifyPath,
      buildVerifyOpinion(state, group.id, [
        {
          findingId: 'UNKNOWN',
          verdict: 'CONFIRMED',
          evidence: 'none',
          reason: 'Unknown decision.',
        },
      ]),
    );

    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'verify',
      group: group.id,
    });

    expect(result.data.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'decision-missing' }),
        expect.objectContaining({ code: 'decision-unknown' }),
      ]),
    );
    const invalidDecision = {
      findingId: `R${group.id}-001`,
      verdict: 'MAYBE',
      evidence: '',
      reason: '',
    };
    writeReviewStateFixtureJson(projectRoot, state, group.verifyPath, {
      ...buildVerifyOpinion(state, group.id, []),
      decisions: [invalidDecision, invalidDecision],
    });
    const invalid = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'verify',
      group: group.id,
    });
    expect(invalid.data.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'enum-invalid' }),
        expect.objectContaining({ code: 'field-empty' }),
        expect.objectContaining({ code: 'decision-unknown' }),
      ]),
    );
  });

  it('validates verifier decisions and binds their hash to the review hash', async () => {
    const state = await prepareState('low');
    const group = state.groups[0];
    const finding = {
      id: `R${group.id}-001`,
      severity: 'error',
      category: 'bug',
      path: 'src/value.ts',
      existingCode: 'export const value = 2;',
      lines: 'unknown',
      rule: 'DEF-1',
      message: 'Defect.',
      evidence: 'src/value.ts:1',
      consequence: 'Failure.',
      recommendedAction: 'Correct it.',
    };
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      roundReviewOpinionPath(group.id, 1),
      {
        ...buildReviewOpinion(state, group),
        findings: [finding],
      },
    );
    await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    const reviewedState = readPersistedReviewState(
      projectRoot,
      state.normalizedBranch,
    );
    const verify = buildVerifyOpinion(state, group.id, [
      {
        findingId: `R${group.id}-001`,
        verdict: 'CONFIRMED',
        evidence: 'src/value.ts:1',
        reason: 'The defect is reproducible.',
      },
    ]);
    const verifyBytes = `${JSON.stringify(verify)}\n`;
    writeFileAtomicallySync(artifactPath(state, group.verifyPath), verifyBytes);

    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'verify',
      group: group.id,
    });

    expect(result.summary).toMatchObject({
      ok: true,
      confirmed: 1,
      refuted: 0,
      indeterminate: 0,
    });
    expect(
      readPersistedReviewState(projectRoot, state.normalizedBranch).groups[0]
        .validated.verify,
    ).toEqual({
      sha256: createHash('sha256').update(verifyBytes).digest('hex'),
      reviewSha256: reviewedState.groups[0].validated.review?.sha256,
    });
    const revalidated = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    expect(revalidated.summary.ok).toBe(true);
    expect(
      readPersistedReviewState(projectRoot, state.normalizedBranch).groups[0]
        .validated.verify,
    ).toBeNull();
  });

  it('validates candidate-only verifier decisions while forbidding review rounds', async () => {
    writeReviewStateFixtureFile(
      projectRoot,
      '.filid/config.json',
      `${JSON.stringify({
        version: '2.0',
        language: 'English',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        structure: { generatedPaths: ['src', '.filid/config.json'] },
      })}\n`,
    );
    writeReviewStateFixtureFile(
      projectRoot,
      'src/INTENT.md',
      '# Invalid generated boundary\n',
    );
    commitReviewStateFixture(projectRoot, 'candidate-only evidence');
    const state = await prepareState('low');
    const group = state.groups[0];
    expect(group.rounds).toBe(0);
    await expect(
      handleReviewState({
        action: 'validate',
        projectRoot,
        branchName: BRANCH,
        kind: 'review',
        group: group.id,
        round: 1,
      }),
    ).rejects.toThrow('has no review rounds');
    const decisions = group.candidateIds.map((findingId) => ({
      findingId,
      verdict: 'INDETERMINATE',
      evidence: 'evidence.md',
      reason: 'Independent reproduction was inconclusive.',
    }));
    writeReviewStateFixtureJson(
      projectRoot,
      state,
      group.verifyPath,
      buildVerifyOpinion(state, group.id, decisions),
    );

    const result = await handleReviewState({
      action: 'validate',
      projectRoot,
      branchName: BRANCH,
      kind: 'verify',
      group: group.id,
    });

    expect(result.summary).toMatchObject({
      ok: true,
      indeterminate: group.candidateIds.length,
    });
  });
});
