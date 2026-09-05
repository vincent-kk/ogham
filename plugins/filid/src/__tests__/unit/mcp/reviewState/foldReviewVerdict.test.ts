import { describe, expect, it } from 'vitest';

import { foldReviewVerdict } from '../../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';

import { buildVerdictReviewFinding } from './helpers/buildVerdictReviewFinding.js';
import { createVerdictFoldFixture } from './helpers/createVerdictFoldFixture.js';

/** Fold input inferred from the pure verdict boundary. */
type FoldReviewVerdictInput = Parameters<typeof foldReviewVerdict>[0];

/** Trusted group evidence carried by one fold input. */
type SealGroupEvidence = FoldReviewVerdictInput['groups'][number];

/** Validated reviewer opinion carried by trusted group evidence. */
type ReviewOpinion = NonNullable<SealGroupEvidence['review']>;

/** Reviewer finding carried by a validated opinion. */
type ReviewFinding = ReviewOpinion['findings'][number];

describe('foldReviewVerdict', () => {
  it('confirms assigned FCA candidates from canonical snapshot evidence', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.verify!.decisions = [];
    const before = JSON.stringify(input);
    const result = foldReviewVerdict(input);
    expect(result.verdict).toBe('REQUEST_CHANGES');
    expect(result.confirmed).toContainEqual(
      expect.objectContaining({
        id: 'FCA-001',
        verdict: 'CONFIRMED',
        decisionEvidence: 'evidence.md#FCA-001',
        decisionReason:
          'canonical structure evidence measured on snapshot snapshot-hash',
      }),
    );
    expect(JSON.stringify(input)).toBe(before);
  });

  it('refutes outside findings with all assigned hunk ranges and rejects verifier overrides', () => {
    const input = createVerdictFoldFixture();
    const group = input.groups[0]!;
    group.verify!.decisions = [];
    group.review!.findings = [
      buildVerdictReviewFinding({ lines: 'unknown', inDiff: false }),
    ];
    group.group.units[0]!.hunks.push({
      oldStart: 10,
      oldEnd: 11,
      newStart: 10,
      newEnd: 12,
    });
    expect(foldReviewVerdict(input).refuted).toContainEqual(
      expect.objectContaining({
        id: 'R01-001',
        verdict: 'REFUTED',
        decisionEvidence: 'src/a.ts:1-4, 10-12',
        decisionReason: 'finding lies outside the changed hunks',
      }),
    );
    group.verify!.decisions = [
      {
        findingId: 'R01-001',
        verdict: 'CONFIRMED',
        evidence: 'src/a.ts:7',
        reason: 'An actor tried to override the deterministic result.',
      },
    ];
    const invalid = foldReviewVerdict(input);
    expect(invalid.verdict).toBe('INCONCLUSIVE');
    expect(invalid.unresolved).toContainEqual(
      expect.objectContaining({
        detail: 'decision coverage mismatch',
        affectsVerdict: true,
      }),
    );
  });

  it.each(['missing', 'duplicate', 'unassigned', 'deterministic'] as const)(
    'rejects %s decision coverage before a confirmed finding',
    (fault) => {
      const input = createVerdictFoldFixture();
      const group = input.groups[0]!;
      group.review!.findings = [buildVerdictReviewFinding()];
      const decision = {
        findingId: 'R01-001',
        verdict: 'CONFIRMED' as const,
        evidence: 'src/a.ts:7',
        reason: 'The defect reproduces.',
      };
      group.verify!.decisions = fault === 'missing' ? [] : [decision];
      if (fault === 'duplicate') group.verify!.decisions.push({ ...decision });
      if (fault === 'unassigned')
        group.verify!.decisions.push({ ...decision, findingId: 'R99-001' });
      if (fault === 'deterministic')
        group.verify!.decisions.push({ ...decision, findingId: 'FCA-001' });
      const result = foldReviewVerdict(input);
      expect(result.verdict).toBe('INCONCLUSIVE');
      expect(result.unresolved).toContainEqual(
        expect.objectContaining({
          detail: 'decision coverage mismatch',
          affectsVerdict: true,
        }),
      );
    },
  );

  it('applies incomplete evidence before a confirmed candidate without dropping roster rows', () => {
    const input = createVerdictFoldFixture();
    input.evidence.evidenceComplete = false;

    const result = foldReviewVerdict(input);

    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.checklist.map(({ path }) => path)).toEqual([
      'src/a.ts',
      'README.md',
    ]);
  });

  it('applies a review gap before a confirmed candidate', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.review!.gaps = [
      {
        path: 'src/a.ts',
        rule: 'RISK-1',
        detail: 'Dependency evidence is unavailable.',
      },
    ];

    const result = foldReviewVerdict(input);

    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.unresolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'src/a.ts',
          rule: 'RISK-1',
          detail: 'Dependency evidence is unavailable.',
          affectsVerdict: true,
        }),
      ]),
    );
  });

  it('applies error indeterminacy before confirmation and synthesizes missing decisions', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.review!.findings = [
      buildVerdictReviewFinding(),
      buildVerdictReviewFinding({ id: 'R01-002' }),
    ];
    input.groups[0]!.verify!.decisions = [
      {
        findingId: 'R01-001',
        verdict: 'INDETERMINATE',
        evidence: 'src/a.ts:7',
        reason: 'Cannot reproduce independently.',
      },
    ];

    const result = foldReviewVerdict(input);

    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.decisions.map(({ id }) => id)).toEqual([
      'R01-001',
      'R01-002',
      'FCA-001',
    ]);
    expect(result.indeterminate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'R01-002', verdict: 'INDETERMINATE' }),
      ]),
    );
    expect(result.unresolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ detail: 'missing decision' }),
      ]),
    );

    input.groups[0]!.verify!.decisions[0]!.verdict = 'REFUTED';
    expect(foldReviewVerdict(input).verdict).toBe('INCONCLUSIVE');
  });

  it('requests changes for a confirmed reviewer finding while retaining FCA decisions', () => {
    const input = createVerdictFoldFixture();
    const finding: ReviewFinding = {
      id: 'R01-001',
      severity: 'error',
      category: 'bug',
      path: 'src/a.ts',
      existingCode: 'return stale;',
      lines: '7-7',
      inDiff: true,
      rule: 'DEF-1',
      message: 'The stale value is returned.',
      evidence: 'src/a.ts:7',
      consequence: 'The caller receives stale data.',
      recommendedAction: 'Return the current value.',
    };
    input.groups[0]!.review!.findings = [finding];
    input.groups[0]!.verify!.decisions.push({
      findingId: 'R01-001',
      verdict: 'CONFIRMED',
      evidence: 'The stale return remains at line 7.',
      reason: 'The defect reproduces.',
    });

    const result = foldReviewVerdict(input);

    expect(result.verdict).toBe('REQUEST_CHANGES');
    expect(result.confirmed).toEqual([
      expect.objectContaining({
        id: 'R01-001',
        origin: 'review',
        verdict: 'CONFIRMED',
      }),
      expect.objectContaining({
        id: 'FCA-001',
        origin: 'fca',
        verdict: 'CONFIRMED',
      }),
    ]);
    expect(result.decisions.map(({ id }) => id)).toEqual([
      'R01-001',
      'FCA-001',
    ]);
  });

  it('approves when assigned reviewer findings are refuted and coverage is complete', () => {
    const input = createVerdictFoldFixture();
    input.candidates = [];
    input.groups[0]!.group.candidateIds = [];
    input.groups[0]!.review!.findings = [buildVerdictReviewFinding()];
    input.groups[0]!.verify!.decisions = [
      {
        findingId: 'R01-001',
        verdict: 'REFUTED',
        evidence: 'src/a.ts:7',
        reason: 'The claim does not reproduce.',
      },
    ];
    const result = foldReviewVerdict(input);

    expect(result.verdict).toBe('APPROVED');
    expect(result.refuted).toEqual([
      expect.objectContaining({ id: 'R01-001', verdict: 'REFUTED' }),
    ]);
    expect(result.filesTotal).toBe(2);
    expect(result.filesReviewed).toBe(1);
    expect(result.filesSkipped).toBe(1);
    expect(result.checklist[1]).toEqual(
      expect.objectContaining({
        path: 'README.md',
        result: 'skipped',
        reason: 'document-only',
      }),
    );
  });

  it('keeps an indeterminate verifier opinion inconclusive after refuted decisions', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.verify!.state = 'INDETERMINATE';
    input.groups[0]!.review!.findings = [
      buildVerdictReviewFinding({ inDiff: false, lines: 'unknown' }),
    ];

    const result = foldReviewVerdict(input);

    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.refuted).toHaveLength(1);
    expect(result.unresolved).toContainEqual({
      source: 'verification 01',
      path: 'opinions/verify-01.json',
      rule: 'verifier state',
      detail: 'verifier opinion is indeterminate',
      affectsVerdict: true,
    });
  });

  it('keeps a reviewer-skipped unit pending with its reason', () => {
    const input = createVerdictFoldFixture();
    input.groups[0]!.review!.files[0] = {
      ...input.groups[0]!.review!.files[0]!,
      result: 'skipped',
      reason: 'binary patch unavailable',
    };

    const result = foldReviewVerdict(input);

    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.checklist[0]).toEqual(
      expect.objectContaining({
        path: 'src/a.ts',
        result: 'pending',
        reason: 'reviewer skipped: binary patch unavailable',
      }),
    );
  });

  it('keeps every untrusted-group reason verdict-affecting', () => {
    const input = createVerdictFoldFixture();
    const group = input.groups[0]!;
    group.review = null;
    group.verify = null;
    group.issues = [
      'review rounds incomplete',
      'artifact not validated',
      'artifact modified after validation',
      'verifier decided a superseded opinion',
    ];

    const result = foldReviewVerdict(input);

    expect(result.verdict).toBe('INCONCLUSIVE');
    expect(result.unresolved.map(({ detail }) => detail)).toEqual(
      expect.arrayContaining([
        'review rounds incomplete',
        'artifact not validated',
        'artifact modified after validation',
        'verifier decided a superseded opinion',
      ]),
    );
    expect(
      result.unresolved.every(({ affectsVerdict }) => affectsVerdict),
    ).toBe(true);
    expect(result.unresolved).not.toContainEqual(
      expect.objectContaining({ detail: 'decision coverage mismatch' }),
    );
  });

  it('collapses every chunk of one path into exactly one roster row', () => {
    const input = createVerdictFoldFixture();
    const group = input.groups[0]!;
    group.group.units = [
      { ...group.group.units[0]!, chunk: { index: 1, total: 2 }, churn: 2 },
      {
        ...group.group.units[0]!,
        chunk: { index: 2, total: 2 },
        churn: 2,
        diffPath: 'diffs/01-src-a-ts-2.diff',
      },
    ];
    group.review!.files = [
      { ...group.review!.files[0]!, chunk: '1/2' },
      { ...group.review!.files[0]!, chunk: '2/2' },
    ];

    const result = foldReviewVerdict(input);
    const sourceRows = result.checklist.filter(
      ({ path }) => path === 'src/a.ts',
    );

    expect(sourceRows).toEqual([
      expect.objectContaining({
        path: 'src/a.ts',
        groups: ['01'],
        result: 'reviewed',
      }),
    ]);
    expect(result.checklist).toHaveLength(2);
  });
});
