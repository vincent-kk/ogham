import { describe, expect, it } from 'vitest';

import type { RuleDocStatus } from '../../../types/manifest.js';
import { renderStatusLines } from '../utils/renderStatusLines.js';

function status(overrides: Partial<RuleDocStatus> = {}): RuleDocStatus {
  return {
    id: 'seiri_agent-legible',
    filename: 'seiri_agent-legible.md',
    title: 'Agent-Legible Code',
    description: 'signposting rules',
    deployed: true,
    templateHash: 'a'.repeat(64),
    deployedHash: 'a'.repeat(64),
    inSync: true,
    ...overrides,
  };
}

describe('renderStatusLines', () => {
  it('injects nothing when no rule is deployed', () => {
    expect(
      renderStatusLines(
        [status({ deployed: false, deployedHash: null, inSync: false })],
        'advisory',
      ),
    ).toEqual([]);
  });

  it('injects nothing when the manifest itself is empty', () => {
    expect(renderStatusLines([], 'strict')).toEqual([]);
  });

  it('renders one line at advisory, naming rules without the plugin prefix', () => {
    const lines = renderStatusLines([status()], 'advisory');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('agent-legible');
    expect(lines[0]).not.toContain('seiri_agent-legible');
  });

  it('reports deployed count against the manifest total', () => {
    const lines = renderStatusLines(
      [
        status(),
        status({ id: 'seiri_naming', deployed: false, inSync: false }),
        status({ id: 'seiri_structure', deployed: false, inSync: false }),
      ],
      'advisory',
    );
    expect(lines[0]).toContain('(1/3)');
  });

  it('adds the dial line only above advisory', () => {
    const advisory = renderStatusLines([status()], 'advisory');
    const standard = renderStatusLines([status()], 'standard');
    expect(advisory.some((line) => line.includes('Intervention'))).toBe(false);
    expect(standard.some((line) => line.includes('Intervention'))).toBe(true);
  });

  it('adds the precedence reminder only at strict', () => {
    const standard = renderStatusLines([status()], 'standard');
    const strict = renderStatusLines([status()], 'strict');
    expect(standard.some((line) => line.includes('Precedence'))).toBe(false);
    expect(strict.some((line) => line.includes('Precedence'))).toBe(true);
  });

  it('never repeats rule content — only points at the directory', () => {
    const joined = renderStatusLines([status()], 'strict').join('\n');
    expect(joined).toContain('.claude/rules/');
    expect(joined).not.toContain('signposting rules');
  });

  it('warns about drifted rules at every dial position', () => {
    const drifted = status({ deployedHash: 'b'.repeat(64), inSync: false });
    for (const dial of ['advisory', 'standard', 'strict'] as const) {
      const lines = renderStatusLines([drifted], dial);
      expect(lines.some((line) => line.includes('differ from'))).toBe(true);
    }
  });

  it('does not warn when every deployed rule matches its template', () => {
    const lines = renderStatusLines([status()], 'standard');
    expect(lines.some((line) => line.includes('differ from'))).toBe(false);
  });

  it('says the config was ignored rather than silently defaulting', () => {
    const lines = renderStatusLines(
      [status()],
      'advisory',
      'config.json is not valid JSON',
    );
    expect(lines.some((line) => line.includes('Ignored .seiri/config.json'))).toBe(
      true,
    );
  });

  it('keeps the default render short enough to stay cheap', () => {
    expect(renderStatusLines([status()], 'advisory').length).toBeLessThanOrEqual(
      2,
    );
  });
});
