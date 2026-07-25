import { describe, expect, it } from 'vitest';

import { routingStance } from '../utils/routingStance.js';

describe('routingStance', () => {
  it('at -2 dispatches only on an explicit ask', () => {
    const lines = routingStance(-2).join('\n');
    expect(lines).toContain('only when the user asks for a provider by name');
    expect(lines).toContain('Never dispatch to move it.');
  });

  it('at -1 requires the provider to own most of the work', () => {
    const lines = routingStance(-1).join('\n');
    expect(lines).toContain('owns most of the work in front of you');
    expect(lines).toContain('a report, not a quota');
  });

  it('at 0 forces the choice before the work starts, not after', () => {
    const lines = routingStance(0).join('\n');
    expect(lines).toContain('before you start, not after');
    // observable properties replace self-assessment ("clearly stronger")
    expect(lines).toContain('self-contained and sizable');
    expect(lines).not.toContain('clearly stronger');
  });

  it('at +1 makes dispatch the default and names the kept part', () => {
    const lines = routingStance(1).join('\n');
    expect(lines).toContain('rather than handling it here');
    expect(lines).toContain('name the part this session must own');
  });

  it('at +2 closes the exception list instead of asking for a free-form reason', () => {
    const lines = routingStance(2).join('\n');
    expect(lines).toContain('only for one of these');
    expect(lines).toContain('(2) it needs files, state, or tools');
    expect(lines).toContain('Nothing else is an exception');
    expect(lines).not.toContain('say why in one line');
  });

  it('forbids ratio-driven dispatch and yields to the user at every strength', () => {
    for (const s of [-2, -1, 0, 1, 2] as const) {
      const lines = routingStance(s).join('\n');
      expect(lines).toContain(
        '- The ratio line reports past turns. Never dispatch to move it.',
      );
      expect(lines).toContain(
        '- An explicit user instruction outranks every line above.',
      );
    }
  });

  it('renders a distinct stance for every strength', () => {
    const rendered = ([-2, -1, 0, 1, 2] as const).map((s) =>
      routingStance(s).join('\n'),
    );
    expect(new Set(rendered).size).toBe(5);
  });
});
