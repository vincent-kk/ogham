// filid:contract AC-restructure-guidance
import { describe, expect, it } from 'vitest';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import type { PlanningDecisionReason } from '../../../types/restructure.js';
import { describeDecision } from '../planner/describeDecision.js';

const CONTEXT = {
  projectRoot: '/root',
  sourcePath: '/root/x/unit.ts',
  placementPath: '/root/x',
  graphCertainty: ANALYSIS_CERTAINTIES.INDETERMINATE,
  organNameHint: '.',
  outsideConsumerPaths: ['/elsewhere/use.ts', '/other/use.ts'],
  entryForms: ['index.ts', 'main.ts'],
};

function isPlanningReason(reason: string): reason is PlanningDecisionReason {
  return reason !== RESTRUCTURE_DECISION_REASONS.MOVE_ORDER_CONFLICT;
}

describe('restructure decision guidance', () => {
  it('explains every planning decision reason with a message and a next action', () => {
    const reasons = Object.values(RESTRUCTURE_DECISION_REASONS).filter(
      isPlanningReason,
    );
    const decisions = reasons.map((reason) =>
      describeDecision(reason, CONTEXT),
    );

    expect(decisions.map(({ reason }) => reason)).toEqual(reasons);
    for (const decision of decisions) {
      expect(decision.message.length).toBeGreaterThan(0);
      expect(decision.nextAction.length).toBeGreaterThan(0);
    }
  });

  it('tells a source outside the project root apart from an unowned one inside it', () => {
    const outside = describeDecision(
      RESTRUCTURE_DECISION_REASONS.SOURCE_PATH_OUTSIDE_PROJECT,
      { ...CONTEXT, sourcePath: '/elsewhere/unit.ts' },
    );
    const unowned = describeDecision(
      RESTRUCTURE_DECISION_REASONS.SOURCE_PATH_OUTSIDE_PROJECT,
      { ...CONTEXT, sourcePath: '/root/loose/unit.ts' },
    );

    expect(outside.message).toBe(
      '/elsewhere/unit.ts is outside the project at /root, so filid cannot plan a move for it.',
    );
    expect(unowned.message).toContain('No fractal owns /root/loose/unit.ts');
    expect(unowned.nextAction).toContain('INTENT.md');
  });

  it('lists the entry forms that leave the new entry file ambiguous', () => {
    const ambiguous = describeDecision(
      RESTRUCTURE_DECISION_REASONS.ENTRY_POINT_EVIDENCE_REQUIRED,
      CONTEXT,
    );
    const absent = describeDecision(
      RESTRUCTURE_DECISION_REASONS.ENTRY_POINT_EVIDENCE_REQUIRED,
      { ...CONTEXT, entryForms: [] },
    );

    expect(ambiguous.message).toContain(
      '2 entry file forms (index.ts, main.ts)',
    );
    expect(absent.message).toContain(
      'no fractal in the project has a module entry file',
    );
  });

  it('interpolates the rejected name hint and the ignored consumers', () => {
    expect(
      describeDecision(RESTRUCTURE_DECISION_REASONS.INVALID_NAME_HINT, CONTEXT)
        .message,
    ).toBe('organNameHint "." is not a single directory name.');
    expect(
      describeDecision(
        RESTRUCTURE_DECISION_REASONS.CONSUMER_PATH_OUTSIDE_PROJECT,
        CONTEXT,
      ).message,
    ).toContain('ignored: /elsewhere/use.ts, /other/use.ts.');
  });
});
