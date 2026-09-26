import { describe, expect, it } from 'vitest';

import type { InterventionState } from '../../../../types/config.js';
import { describeDial } from '../utils/describeDial.js';
import { renderPostureLines } from '../utils/renderPostureLines.js';

function state(overrides: Partial<InterventionState> = {}): InterventionState {
  return {
    effective: 'advisory',
    source: 'default',
    baseline: null,
    user: null,
    runtime: null,
    warnings: [],
    ...overrides,
  };
}

/**
 * What each dial position says out loud. `advisory` saying nothing is the
 * load-bearing case: it is the state the dispatch measurements were taken
 * against, so anything added there would invalidate the baseline the
 * whole pre-emptive wiring is gated on.
 */
describe('dial render', () => {
  it('renders no workflow posture at off', () => {
    expect(renderPostureLines('off')).toEqual([]);
  });

  it('says nothing about the workflow at advisory', () => {
    expect(renderPostureLines('advisory')).toEqual([]);
  });

  it('states the fixed chain, host-neutral', () => {
    const standard = renderPostureLines('standard');
    expect(standard).toHaveLength(1);
    expect(standard[0]).toContain('seiri:write-plan');
    expect(standard[0]).not.toContain('/seiri:');
  });

  it('adds the strict posture line, keeping the chain', () => {
    const strict = renderPostureLines('strict');
    expect(strict).toHaveLength(2);
    expect(strict[0]).toBe(renderPostureLines('standard')[0]);
    expect(strict[1]).toContain('Posture (strict)');
    expect(strict[1]).toContain('verification');
  });

  it('names only the dial when it came from the committed baseline', () => {
    expect(
      describeDial(state({ effective: 'standard', source: 'baseline' })),
    ).toBe('Intervention: standard');
  });

  it('names the valve and what it overrode when the dial came from runtime', () => {
    const line = describeDial(
      state({ effective: 'advisory', source: 'runtime', baseline: 'strict' }),
    );
    expect(line).toContain('advisory');
    expect(line).toContain('runtime');
    expect(line).toContain('baseline: strict');
  });
});
