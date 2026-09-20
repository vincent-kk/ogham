import { describe, expect, it } from 'vitest';

import {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_ADJUDICATION_STATES,
  FACTS_DECISIONS,
} from '../../../constants/facts.js';
import { adjudicateItem, normalizeActor } from '../../../core/facts/index.js';
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

const { PENDING_DISMISS, DISMISSED } = FACTS_ADJUDICATION_STATES;
const { DISMISS } = FACTS_DECISIONS;

describe('actor identity folding', () => {
  it('treats trailing space, case and width as the same actor', () => {
    const spellings = ['reviewer ', 'REVIEWER', 'ｒｅｖｉｅｗｅｒ'];

    for (const spelling of spellings)
      expect(
        adjudicateItem(item(PENDING_DISMISS, 'reviewer'), DISMISS, spelling)
          .state,
      ).toBe(PENDING_DISMISS);
  });

  it('still lets a genuinely different actor confirm', () => {
    expect(
      adjudicateItem(item(PENDING_DISMISS, 'reviewer'), DISMISS, 'verifier')
        .state,
    ).toBe(DISMISSED);
  });

  it('folds an identity to nothing when it carries no characters', () => {
    expect(normalizeActor('   ')).toBeNull();
    expect(normalizeActor(' ')).toBeNull();
  });

  it('keeps a real identity comparable after folding', () => {
    expect(normalizeActor(' Reviewer ')).toBe('reviewer');
  });
});
