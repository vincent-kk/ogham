import { describe, expect, it } from 'vitest';

import {
  type RuleDocFacts,
  decideRuleDocAction,
} from '../utils/decideRuleDocAction.js';

const TEMPLATE_HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);

function facts(overrides: Partial<RuleDocFacts> = {}): RuleDocFacts {
  return {
    selected: true,
    resync: false,
    destExists: false,
    deployedHash: null,
    templateHash: TEMPLATE_HASH,
    templateExists: true,
    ...overrides,
  };
}

describe('decideRuleDocAction', () => {
  it('removes a deployed file the user deselected', () => {
    const decision = decideRuleDocAction(
      facts({ selected: false, destExists: true, deployedHash: TEMPLATE_HASH }),
    );
    expect(decision).toMatchObject({
      action: 'remove',
      write: false,
      remove: true,
    });
  });

  it('leaves a deselected rule alone when nothing is deployed', () => {
    const decision = decideRuleDocAction(facts({ selected: false }));
    expect(decision).toMatchObject({
      action: 'unchanged',
      write: false,
      remove: false,
    });
  });

  it('copies a selected rule that is not yet deployed', () => {
    expect(decideRuleDocAction(facts())).toMatchObject({
      action: 'copy',
      write: true,
      remove: false,
    });
  });

  it('reports unchanged when the deployed bytes match the template', () => {
    const decision = decideRuleDocAction(
      facts({ destExists: true, deployedHash: TEMPLATE_HASH }),
    );
    expect(decision).toMatchObject({ action: 'unchanged', write: false });
  });

  it('reports drift without writing when local edits are not resynced', () => {
    const decision = decideRuleDocAction(
      facts({ destExists: true, deployedHash: OTHER_HASH }),
    );
    expect(decision.action).toBe('drift');
    expect(decision.write).toBe(false);
    expect(decision.remove).toBe(false);
    expect(decision.reason).toBeTruthy();
  });

  it('overwrites drift only when the rule id was resynced', () => {
    const decision = decideRuleDocAction(
      facts({ destExists: true, deployedHash: OTHER_HASH, resync: true }),
    );
    expect(decision).toMatchObject({
      action: 'update',
      write: true,
      remove: false,
    });
  });

  it('treats an unreadable deployed file as drift, not as a match', () => {
    const decision = decideRuleDocAction(
      facts({ destExists: true, deployedHash: null }),
    );
    expect(decision.action).toBe('drift');
    expect(decision.write).toBe(false);
  });

  it('resyncs an unreadable deployed file when asked', () => {
    const decision = decideRuleDocAction(
      facts({ destExists: true, deployedHash: null, resync: true }),
    );
    expect(decision).toMatchObject({ action: 'update', write: true });
  });

  it('skips with a reason when the shipped template is missing', () => {
    const decision = decideRuleDocAction(facts({ templateExists: false }));
    expect(decision.action).toBe('skip');
    expect(decision.write).toBe(false);
    expect(decision.reason).toContain('template');
  });

  it('never writes a missing template over a drifted deployed file', () => {
    const decision = decideRuleDocAction(
      facts({
        destExists: true,
        deployedHash: OTHER_HASH,
        resync: true,
        templateExists: false,
      }),
    );
    expect(decision).toMatchObject({ action: 'skip', write: false });
  });

  it('still removes a deselected rule whose template is missing', () => {
    const decision = decideRuleDocAction(
      facts({ selected: false, destExists: true, templateExists: false }),
    );
    expect(decision).toMatchObject({ action: 'remove', remove: true });
  });
});
