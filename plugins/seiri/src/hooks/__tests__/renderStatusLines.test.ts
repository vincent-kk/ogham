import { describe, expect, it } from 'vitest';

import type {
  InterventionLevel,
  InterventionState,
} from '../../types/config.js';
import type { RuleDocStatus } from '../../types/manifest.js';
import { renderStatusLines } from '../shared/renderStatusLines.js';

function status(overrides: Partial<RuleDocStatus> = {}): RuleDocStatus {
  return {
    id: 'seiri_agent-legible',
    filename: 'seiri_agent-legible.md',
    title: 'Agent-Legible Code',
    description: 'signposting rules',
    recommended: true,
    deployed: true,
    templateHash: 'a'.repeat(64),
    deployedHash: 'a'.repeat(64),
    inSync: true,
    ...overrides,
  };
}

function dial(
  effective: InterventionLevel,
  overrides: Partial<InterventionState> = {},
): InterventionState {
  return {
    effective,
    source: effective === 'advisory' ? 'default' : 'baseline',
    baseline: effective === 'advisory' ? null : effective,
    runtime: null,
    warnings: [],
    ...overrides,
  };
}

describe('renderStatusLines', () => {
  it('injects nothing when no rule is deployed', () => {
    expect(
      renderStatusLines(
        [status({ deployed: false, deployedHash: null, inSync: false })],
        dial('advisory'),
      ),
    ).toEqual([]);
  });

  it('injects nothing when the manifest itself is empty', () => {
    expect(renderStatusLines([], dial('strict'))).toEqual([]);
  });

  it('renders one line at advisory, naming rules without the plugin prefix', () => {
    const lines = renderStatusLines([status()], dial('advisory'));
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
      dial('advisory'),
    );
    expect(lines[0]).toContain('(1/3)');
  });

  it('adds the dial line only above advisory', () => {
    const advisory = renderStatusLines([status()], dial('advisory'));
    const standard = renderStatusLines([status()], dial('standard'));
    expect(advisory.some((line) => line.includes('Intervention'))).toBe(false);
    expect(standard.some((line) => line.includes('Intervention'))).toBe(true);
  });

  it('adds the precedence reminder only at strict', () => {
    const standard = renderStatusLines([status()], dial('standard'));
    const strict = renderStatusLines([status()], dial('strict'));
    expect(standard.some((line) => line.includes('Precedence'))).toBe(false);
    expect(strict.some((line) => line.includes('Precedence'))).toBe(true);
  });

  it('never repeats rule content — only points at the directory', () => {
    const joined = renderStatusLines([status()], dial('strict')).join('\n');
    expect(joined).toContain('.claude/rules/');
    expect(joined).not.toContain('signposting rules');
  });

  it('warns about drifted rules at every dial position', () => {
    const drifted = status({ deployedHash: 'b'.repeat(64), inSync: false });
    for (const level of ['advisory', 'standard', 'strict'] as const) {
      const lines = renderStatusLines([drifted], dial(level));
      expect(lines.some((line) => line.includes('differ from'))).toBe(true);
    }
  });

  it('does not warn when every deployed rule matches its template', () => {
    const lines = renderStatusLines([status()], dial('standard'));
    expect(lines.some((line) => line.includes('differ from'))).toBe(false);
  });

  it('says which stored file was ignored rather than silently defaulting', () => {
    const lines = renderStatusLines(
      [status()],
      dial('advisory', {
        warnings: [
          { file: '.seiri/config.json', reason: 'not valid JSON' },
          { file: '.seiri/runtime.json', reason: 'not a JSON object' },
        ],
      }),
    );
    expect(
      lines.some((line) => line.includes('Ignored .seiri/config.json')),
    ).toBe(true);
    expect(
      lines.some((line) => line.includes('Ignored .seiri/runtime.json')),
    ).toBe(true);
  });

  it('keeps the default render short enough to stay cheap', () => {
    expect(
      renderStatusLines([status()], dial('advisory')).length,
    ).toBeLessThanOrEqual(2);
  });

  it('says nothing about the workflow at advisory', () => {
    const joined = renderStatusLines([status()], dial('advisory')).join('\n');
    expect(joined).not.toContain('Workflow');
    expect(joined).not.toContain('trace-cause');
  });

  it('announces the discipline chain from standard up, widening it at strict', () => {
    const standard = renderStatusLines([status()], dial('standard'));
    const strict = renderStatusLines([status()], dial('strict'));
    expect(standard.some((line) => line.includes('Workflow:'))).toBe(true);
    expect(standard.some((line) => line.includes('Borderline'))).toBe(false);
    expect(strict.some((line) => line.includes('Borderline'))).toBe(true);
  });

  it('names a runtime valve even when it lowered the dial to advisory', () => {
    const lines = renderStatusLines(
      [status()],
      dial('advisory', {
        source: 'runtime',
        runtime: 'advisory',
        baseline: 'strict',
      }),
    );
    const line = lines.find((entry) => entry.includes('Intervention'));
    expect(line).toBeDefined();
    expect(line).toContain('runtime');
    expect(line).toContain('baseline: strict');
  });

  it('stays inside the render budget at its widest', () => {
    const lines = renderStatusLines(
      [status({ deployedHash: 'b'.repeat(64), inSync: false })],
      dial('strict', {
        warnings: [
          { file: '.seiri/config.json', reason: 'not valid JSON' },
          { file: '.seiri/runtime.json', reason: 'not a JSON object' },
        ],
      }),
    );
    expect(lines.length).toBeLessThanOrEqual(8);
    expect(
      renderStatusLines([status()], dial('standard')).length,
    ).toBeLessThanOrEqual(5);
  });
});
