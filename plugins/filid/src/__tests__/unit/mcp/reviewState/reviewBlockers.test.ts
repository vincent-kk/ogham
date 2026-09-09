import { describe, expect, it } from 'vitest';

import { buildReviewBlockers } from '../../../../mcp/tools/reviewState/verdict/blockers/buildReviewBlockers.js';
import { buildChecklist } from '../../../../mcp/tools/reviewState/verdict/buildChecklist.js';
import { foldReviewVerdict } from '../../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';
import { joinDecisions } from '../../../../mcp/tools/reviewState/verdict/joinDecisions.js';

import { buildVerdictReviewFinding } from './helpers/buildVerdictReviewFinding.js';
import { createVerdictFoldFixture } from './helpers/createVerdictFoldFixture.js';

/** An unresolved contract question with no actor-provided routing advice. */
const GAP = {
  path: '.',
  rule: 'FCA-11',
  detail: 'Project evidence cannot settle the contract.',
};

/** Bounded resolution proposal used to test attention routing. */
const ADVICE = {
  question: 'Which contract is intended?',
  evidenceNeeded: ['The acceptance group'],
  nextAction: 'Confirm the intended contract.',
  doneWhen: 'The chosen contract has been verified.',
  suggestedOwner: 'human' as const,
  humanReason: 'Two supported contracts differ in behavior.',
  options: ['Preserve current behavior', 'Adopt the new contract'],
};

describe('review blocker projection', () => {
  it('keeps confirmed findings and justified exclusions out of blockers', () => {
    const input = createVerdictFoldFixture();
    const fold = foldReviewVerdict(input);
    expect(fold.verdict).toBe('REQUEST_CHANGES');
    expect(fold.confirmed).toHaveLength(1);
    expect(fold.blockers).toEqual([]);
  });

  it('finds incomplete analysis even when unresolved evidence rows are empty', () => {
    const input = createVerdictFoldFixture();
    input.evidence.evidenceComplete = false;
    input.evidence.verificationStatus = 'indeterminate';
    const fold = foldReviewVerdict(input);
    expect(fold.unresolved).toEqual([]);
    expect(fold.blockers).toMatchObject([
      { kind: 'analysis-incomplete', adviceSource: 'deterministic' },
    ]);
    expect(fold.blockers[0]!.detail).toContain('verification=indeterminate');
  });

  it.each(['documents-only', 'source-dirty'] as const)(
    'projects %s as a worktree blocker',
    (worktree) => {
      const input = createVerdictFoldFixture();
      input.evidence.worktree = worktree;
      expect(foldReviewVerdict(input).blockers).toMatchObject([
        { kind: 'dirty-worktree' },
      ]);
    },
  );

  it('exposes pending coverage and its source without inventing human authority', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.review!.files = [];
    const blocker = foldReviewVerdict(input).blockers.find(
      (item) => item.kind === 'coverage-pending',
    )!;
    expect(blocker.scope.path).toBe('src/a.ts');
    expect(blocker.resolution.nextAction).toBeTruthy();
    expect(blocker.sources.length).toBeGreaterThan(0);
    expect(blocker.attention).not.toBe('human-decision');
  });

  it.each([
    'review rounds incomplete',
    'artifact not validated',
    'artifact modified after validation',
    'verifier decided a superseded opinion',
  ] as const)('exposes typed artifact trust: %s', (issue) => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.issues = [issue];
    input.groups[0]!.review!.gaps = [{ ...GAP, resolution: ADVICE }];
    const blockers = foldReviewVerdict(input).blockers;
    expect(blockers).toContainEqual(
      expect.objectContaining({ kind: 'artifact-trust', detail: issue }),
    );
    expect(blockers).toHaveLength(1);
    expect(blockers.some((item) => item.adviceSource === 'actor')).toBe(false);
  });

  it('does not hide a COMPLETE review gap behind zero indeterminate decisions', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.review!.gaps = [GAP];
    const fold = foldReviewVerdict(input);
    expect(fold.indeterminate).toHaveLength(0);
    expect(fold.blockers).toMatchObject([
      {
        kind: 'review-gap',
        attention: 'triage',
        adviceSource: 'missing',
        scope: { rule: GAP.rule },
        sources: [
          { artifactPath: 'opinions/review-01.json', pointer: '/gaps/0' },
        ],
      },
    ]);
  });

  it('keeps verifier-level uncertainty separate from candidate decisions', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.verify!.state = 'INDETERMINATE';
    input.groups[0]!.verify!.resolution = ADVICE;
    expect(foldReviewVerdict(input).blockers).toMatchObject([
      {
        kind: 'verifier-indeterminate',
        attention: 'human-decision',
        resolution: ADVICE,
      },
    ]);
  });

  it('carries decision advice without reinterpreting its verdict', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.review!.findings = [buildVerdictReviewFinding()];
    input.groups[0]!.verify!.decisions = [
      {
        findingId: 'R01-001',
        verdict: 'INDETERMINATE',
        evidence: 'Missing contract',
        reason: 'The expected output depends on a decision.',
        resolution: ADVICE,
      },
    ];
    const fold = foldReviewVerdict(input);
    expect(fold.verdict).toBe('REQUEST_CHANGES');
    expect(fold.reviewComplete).toBe(false);
    expect(fold.confirmed).toHaveLength(1);
    expect(fold.blockers).toMatchObject([
      {
        kind: 'decision-indeterminate',
        scope: { findingId: 'R01-001' },
        resolution: ADVICE,
      },
    ]);
  });

  it('joins missing decision coverage and synthesized uncertainty into one item', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.review!.findings = [buildVerdictReviewFinding()];
    const blockers = foldReviewVerdict(input).blockers;
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({
      kind: 'decision-indeterminate',
      scope: { findingId: 'R01-001' },
    });
    expect(blockers[0]!.sources.length).toBeGreaterThan(1);
  });

  it.each(['duplicate', 'unassigned', 'deterministic'] as const)(
    'retains %s decision-set errors',
    (fault) => {
      const input = createVerdictFoldFixture();
      const group = input.groups[0]!;
      group.review!.findings = [buildVerdictReviewFinding()];
      const decision = {
        findingId: 'R01-001',
        verdict: 'CONFIRMED' as const,
        evidence: 'Source evidence',
        reason: 'Reproduced.',
      };
      group.verify!.decisions = [
        decision,
        {
          ...decision,
          findingId:
            fault === 'duplicate'
              ? 'R01-001'
              : fault === 'unassigned'
                ? 'R99-001'
                : 'FCA-001',
        },
      ];
      expect(foldReviewVerdict(input).blockers).toContainEqual(
        expect.objectContaining({ kind: 'decision-coverage' }),
      );
    },
  );

  it('deduplicates exact gaps across groups while retaining all sources and distinct rules', () => {
    const input = createVerdictFoldFixture();
    const first = input.groups[0]!;
    first.review!.gaps = [GAP, { ...GAP, rule: 'FCA-12' }];
    const second = structuredClone(first);
    second.group.id = second.review!.group = second.verify!.group = '02';
    second.group.opinionPath = 'opinions/review-02.json';
    second.group.verifyPath = 'opinions/verify-02.json';
    second.group.candidateIds = [];
    input.groups = [first, second];
    const before = JSON.stringify(input);
    const blocks = foldReviewVerdict(input).blockers;
    expect(blocks).toHaveLength(2);
    expect(blocks.every((item) => item.sources.length === 2)).toBe(true);
    expect(blocks.map((item) => item.id)).toEqual(['BLK-001', 'BLK-002']);
    input.groups = [second, first];
    expect(
      foldReviewVerdict(input).blockers.map(({ id, kind, detail }) => ({
        id,
        kind,
        detail,
      })),
    ).toEqual(blocks.map(({ id, kind, detail }) => ({ id, kind, detail })));
    input.groups = [first, second];
    expect(JSON.stringify(input)).toBe(before);
  });

  it('routes conflicting independent advice to triage and preserves alternatives', () => {
    const input = createVerdictFoldFixture();
    const first = input.groups[0]!;
    first.review!.gaps = [{ ...GAP, resolution: ADVICE }];
    const second = structuredClone(first);
    second.group.id = second.review!.group = second.verify!.group = '02';
    second.group.opinionPath = 'opinions/review-02.json';
    second.group.candidateIds = [];
    second.review!.gaps[0]!.resolution = {
      ...ADVICE,
      suggestedOwner: 'agent',
      nextAction: 'Read the missing fixture first.',
    };
    input.groups = [first, second];
    expect(foldReviewVerdict(input).blockers).toMatchObject([
      {
        attention: 'triage',
        adviceSource: 'conflict',
        alternativeResolutions: expect.any(Array),
      },
    ]);
    expect(
      foldReviewVerdict(input).blockers[0]!.alternativeResolutions,
    ).toHaveLength(2);
  });

  it('excludes neutral observations even when analysis is inconclusive', () => {
    const input = createVerdictFoldFixture();
    input.evidence.evidenceComplete = false;
    input.groups[0]!.verify!.observations = [
      {
        path: 'unrelated.ts',
        detail: 'Human approval required: unrelated observation.',
      },
    ];
    expect(foldReviewVerdict(input).blockers).toHaveLength(1);
    expect(foldReviewVerdict(input).blockers[0]!.kind).toBe(
      'analysis-incomplete',
    );
  });

  it('surfaces an unclassified fallback if a future fold condition has no typed cause', () => {
    const input = createVerdictFoldFixture();
    const blockers = buildReviewBlockers(
      input,
      buildChecklist(input.files, input.groups),
      joinDecisions(
        input.groups,
        input.candidates,
        input.evidence.snapshotHash,
      ),
      'INCONCLUSIVE',
    );
    expect(blockers).toMatchObject([
      {
        kind: 'unclassified',
        attention: 'triage',
        adviceSource: 'missing',
      },
    ]);
  });
});
