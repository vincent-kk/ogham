import { describe, expect, it } from 'vitest';

import type { InterventionState } from '../../../../types/config.js';
import type { RuleDocStatus } from '../../../../types/manifest.js';
import type { WorkflowBinding } from '../../../../types/workflow.js';
import { renderProgressLine } from '../../../shared/progressLine/renderProgressLine.js';
import { renderSessionStart } from '../renderSessionStart.js';

const DIAL_STANDARD: InterventionState = {
  effective: 'standard',
  source: 'baseline',
  baseline: 'standard',
  user: null,
  runtime: null,
  warnings: [],
};

const DIAL_STRICT: InterventionState = {
  ...DIAL_STANDARD,
  effective: 'strict',
};

function rule(overrides: Partial<RuleDocStatus> = {}): RuleDocStatus {
  return {
    id: 'seiri_agent-legible',
    filename: 'agent-legible.md',
    target: '/repo/.claude/rules/seiri_agent-legible.md',
    displayTarget: '.claude/rules/seiri_agent-legible.md',
    source: 'current',
    title: 'Agent-Legible Code',
    description: '',
    recommended: true,
    deployed: true,
    active: true,
    activeTarget: '/repo/.claude/rules/seiri_agent-legible.md',
    activeDisplayTarget: '.claude/rules/seiri_agent-legible.md',
    activeDeployedHash: 'abc',
    activeInSync: true,
    activeSource: 'current',
    templateHash: 'abc',
    deployedHash: 'abc',
    inSync: true,
    ...overrides,
  };
}

const ELECTION = 'Election: fixture line.';
const CHAIN = 'Workflow: fixture chain.';
const POSTURE = 'Posture (strict): fixture posture.';

describe('renderSessionStart', () => {
  it('orders rule summary, dial, drift, election, chain at standard with rule status', () => {
    const lines = renderSessionStart({
      dial: DIAL_STANDARD,
      ruleStatuses: [rule(), rule({ id: 'seiri_naming', activeInSync: false })],
      election: ELECTION,
      chain: CHAIN,
    });
    expect(lines[0]).toContain('Active rules:');
    expect(lines[1]).toContain('Intervention: standard');
    expect(lines[2]).toContain('differ from the shipped template');
    expect(lines[3]).toBe(`[seiri] ${ELECTION}`);
    expect(lines[4]).toBe(`[seiri] ${CHAIN}`);
    expect(lines).toHaveLength(5);
  });

  it('omits the rule summary and drift lines when rule status is unreadable, keeping election and chain', () => {
    const lines = renderSessionStart({
      dial: DIAL_STANDARD,
      election: ELECTION,
      chain: CHAIN,
    });
    expect(lines).toEqual([
      `[seiri] Intervention: standard`,
      `[seiri] ${ELECTION}`,
      `[seiri] ${CHAIN}`,
    ]);
  });

  it('omits the rule summary when no rule is active, keeping dial, election and chain', () => {
    const lines = renderSessionStart({
      dial: DIAL_STANDARD,
      ruleStatuses: [rule({ active: false })],
      election: ELECTION,
      chain: CHAIN,
    });
    expect(lines).toEqual([
      `[seiri] Intervention: standard`,
      `[seiri] ${ELECTION}`,
      `[seiri] ${CHAIN}`,
    ]);
  });

  it('appends the posture line at strict only', () => {
    const standard = renderSessionStart({
      dial: DIAL_STANDARD,
      election: ELECTION,
      chain: CHAIN,
    });
    expect(standard.some((line) => line.includes('Posture'))).toBe(false);

    const strict = renderSessionStart({
      dial: DIAL_STRICT,
      election: ELECTION,
      chain: CHAIN,
      posture: POSTURE,
    });
    expect(strict.at(-1)).toBe(`[seiri] ${POSTURE}`);
  });

  it('appends the progress line last when a binding is present, at strict', () => {
    const binding: WorkflowBinding = {
      task: 'task-a',
      intent: 'change',
      state: 'active',
      step: 'write-plan',
      counts: {},
      announced: [],
      verdicts: {},
    };
    const lines = renderSessionStart({
      dial: DIAL_STRICT,
      election: ELECTION,
      chain: CHAIN,
      posture: POSTURE,
      binding,
    });
    expect(lines.at(-1)).toBe(
      renderProgressLine(binding.task, binding.intent, binding.step),
    );
  });

  it('leaves the output unchanged when no binding is passed', () => {
    const withoutBinding = renderSessionStart({
      dial: DIAL_STANDARD,
      election: ELECTION,
      chain: CHAIN,
    });
    expect(withoutBinding).toEqual([
      `[seiri] Intervention: standard`,
      `[seiri] ${ELECTION}`,
      `[seiri] ${CHAIN}`,
    ]);
  });
});
