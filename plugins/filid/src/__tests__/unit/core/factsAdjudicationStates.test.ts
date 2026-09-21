import { describe, expect, it } from 'vitest';

import {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_ADJUDICATION_STATES,
  FACTS_DECISIONS,
} from '../../../constants/facts.js';
import { adjudicateItem } from '../../../core/facts/index.js';
import type {
  AdjudicationItem,
  AdjudicationState,
} from '../../../core/facts/index.js';

/**
 * One side-table item in a given state.
 * @param state State the item is in.
 * @param actor Actor attached to a pending dismissal, if any.
 * @returns The item to adjudicate.
 */
function item(state: AdjudicationState, actor?: string): AdjudicationItem {
  return {
    path: 'src/index.ts',
    kind: 'static',
    reference: './thing.js',
    resolvedPath: 'src/thing.ts',
    origin: FACTS_ADJUDICATION_ORIGINS.MISSING_IN_STORE,
    state,
    lineDigest: 'sha256:lines',
    contentHash: 'sha256:bytes',
    ...(actor === undefined ? {} : { actor }),
  };
}

const { UNADJUDICATED, PENDING_DISMISS, ADOPTED, DISMISSED, CLOSED_BY_RECORD } =
  FACTS_ADJUDICATION_STATES;
const { ADOPT, DISMISS } = FACTS_DECISIONS;

describe('adjudication transitions — unadjudicated', () => {
  it('cell 1: adopt confirms with one actor', () => {
    const outcome = adjudicateItem(item(UNADJUDICATED), ADOPT, 'A');

    expect(outcome).toMatchObject({ state: ADOPTED, changed: true });
    expect(outcome.nextAction).toBe('');
  });

  it('cell 2: dismiss parks as pending and asks for a different actor', () => {
    const outcome = adjudicateItem(item(UNADJUDICATED), DISMISS, 'A');

    expect(outcome).toMatchObject({
      state: PENDING_DISMISS,
      actor: 'A',
      changed: true,
    });
    expect(outcome.nextAction).toContain('different actor');
  });
});

describe('adjudication transitions — pending-dismiss', () => {
  it('cell 5: the same actor dismissing again changes nothing and says so', () => {
    const outcome = adjudicateItem(item(PENDING_DISMISS, 'A'), DISMISS, 'A');

    expect(outcome).toMatchObject({ state: PENDING_DISMISS, changed: false });
    expect(outcome.nextAction).toContain('different actor');
  });

  it('cell 6: a different actor dismissing confirms it', () => {
    const outcome = adjudicateItem(item(PENDING_DISMISS, 'A'), DISMISS, 'B');

    expect(outcome).toMatchObject({ state: DISMISSED, changed: true });
    expect(outcome.nextAction).toBe('');
  });

  it('cell 7: a different actor adopting keeps the edge', () => {
    const outcome = adjudicateItem(item(PENDING_DISMISS, 'A'), ADOPT, 'B');

    expect(outcome).toMatchObject({ state: ADOPTED, changed: true });
  });

  it('cell 8: the same actor reversing itself adopts', () => {
    const outcome = adjudicateItem(item(PENDING_DISMISS, 'A'), ADOPT, 'A');

    expect(outcome).toMatchObject({ state: ADOPTED, changed: true });
  });
});

describe('adjudication transitions — adopted', () => {
  it('cell 11: dismissing an adopted edge reopens it as pending', () => {
    const outcome = adjudicateItem(item(ADOPTED), DISMISS, 'A');

    expect(outcome).toMatchObject({
      state: PENDING_DISMISS,
      actor: 'A',
      changed: true,
    });
  });

  it('cell 12: adopting an adopted edge changes nothing', () => {
    const outcome = adjudicateItem(item(ADOPTED), ADOPT, 'A');

    expect(outcome).toMatchObject({ state: ADOPTED, changed: false });
    expect(outcome.nextAction).toBe('');
  });
});

describe('adjudication transitions — dismissed', () => {
  it('cell 14: adopting a dismissed edge reinstates it with one actor', () => {
    const outcome = adjudicateItem(item(DISMISSED), ADOPT, 'A');

    expect(outcome).toMatchObject({ state: ADOPTED, changed: true });
  });

  it('cell 15: dismissing a dismissed edge changes nothing', () => {
    const outcome = adjudicateItem(item(DISMISSED), DISMISS, 'A');

    expect(outcome).toMatchObject({ state: DISMISSED, changed: false });
    expect(outcome.nextAction).toBe('');
  });
});

describe('adjudication transitions — closed-by-record', () => {
  it('cell 17 (adopt): refuses, and names the resubmission that reopens it', () => {
    const outcome = adjudicateItem(item(CLOSED_BY_RECORD), ADOPT, 'A');

    expect(outcome).toMatchObject({ state: CLOSED_BY_RECORD, changed: false });
    expect(outcome.nextAction).toContain('coverage-shrank');
  });

  it('cell 17 (dismiss): refuses the same way', () => {
    const outcome = adjudicateItem(item(CLOSED_BY_RECORD), DISMISS, 'A');

    expect(outcome).toMatchObject({ state: CLOSED_BY_RECORD, changed: false });
    expect(outcome.nextAction).toContain('coverage-shrank');
  });
});

describe('adjudication is asymmetric on purpose', () => {
  it('never removes an edge on one actor alone', () => {
    const reachedDismissed = [UNADJUDICATED, ADOPTED, PENDING_DISMISS].filter(
      (state) =>
        adjudicateItem(item(state, 'A'), DISMISS, 'A').state === DISMISSED,
    );

    expect(reachedDismissed).toEqual([]);
  });

  it('always lets one actor put an edge back', () => {
    const states = [UNADJUDICATED, PENDING_DISMISS, DISMISSED, ADOPTED];

    expect(
      states.map((state) => adjudicateItem(item(state, 'A'), ADOPT, 'A').state),
    ).toEqual([ADOPTED, ADOPTED, ADOPTED, ADOPTED]);
  });
});
