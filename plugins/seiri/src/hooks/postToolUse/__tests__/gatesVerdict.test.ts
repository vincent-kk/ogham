import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../../types/config.js';
import type { PostToolUseFailureInput } from '../../../types/hooks.js';
import {
  activateWorkflow,
  observeBash,
} from '../../__tests__/helpers/workflowHarness.js';

/** Hook session shared by the isolated test calls. */
const SESSION = 'session-a';

/** Runnable command shared by the representative ledger. */
const COMMAND = 'yarn test:run';

/** Two-gate ledger whose second gate keeps progress open after G1 passes. */
const LEDGER = `# Gates: payment-refactor

- [ ] G1: verification passes
  CHECK: yarn test:run
  EXPECT: 8/8 passed
  EVIDENCE: pending

- [ ] G2: reviewer accepts
  EVIDENCE: pending
`;

/** Temporary repositories owned by this test file. */
const createdRoots: string[] = [];

afterEach(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
  createdRoots.length = 0;
});

/**
 * Create an isolated repository with the requested intervention dial.
 *
 * @param intervention Dial value written to project configuration.
 * @returns Repository root with a `.git` marker.
 */
function makeRepoRoot(intervention: InterventionLevel = 'standard'): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-hook-gates-'));
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  writeConfig(root, 'project', { intervention });
  activateWorkflow(root);
  return root;
}

/**
 * Write one task ledger beneath an isolated repository.
 *
 * @param root Repository root that owns the task.
 * @param task Valid task directory name.
 * @param ledger Complete ledger bytes.
 * @returns Absolute ledger path.
 */
function seedTask(root: string, task: string, ledger: string): string {
  const dir = portableJoin(root, '.seiri', 'tasks', task);
  mkdirSync(dir, { recursive: true });
  const path = portableJoin(dir, 'gates.md');
  writeFileSync(path, ledger);
  return path;
}

describe('PostToolUse gate verdicts', () => {
  it('records exit-zero evidence and reports progress', () => {
    const root = makeRepoRoot();
    const path = seedTask(root, 'payment-refactor', LEDGER);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: 'starting\n8/8 passed\ncomplete', stderr: '' },
    });

    expect(output.hookSpecificOutput?.additionalContext).toContain(
      'payment-refactor G1 met — evidence recorded (1/2, next G2)',
    );
    expect(output).not.toHaveProperty('decision');
    const ledger = readFileSync(path, 'utf8');
    expect(ledger).toContain('- [x] G1');
    expect(ledger).toMatch(/^ {2}EVIDENCE: 8\/8 passed/m);
  });

  it('reports an exit-zero mismatch without changing the ledger', () => {
    const root = makeRepoRoot();
    const path = seedTask(root, 'payment-refactor', LEDGER);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: '7/8 passed', stderr: '' },
    });

    expect(output.hookSpecificOutput?.additionalContext).toContain(
      'unmet — expected success marker not found in output',
    );
    expect(readFileSync(path, 'utf8')).toBe(LEDGER);
  });

  it('records designed non-zero evidence without naming a host channel', () => {
    const root = makeRepoRoot();
    const path = seedTask(root, 'payment-refactor', LEDGER);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      error: 'Exit code 1\nboom: 8/8 passed',
      is_interrupt: false,
    });

    expect(output.hookSpecificOutput?.additionalContext).toContain(
      'met — evidence recorded (1/2, next G2)',
    );
    expect(readFileSync(path, 'utf8')).toMatch(/EVIDENCE: .* \(exit 1\)$/m);
  });

  it('reports a non-zero stderr mismatch', () => {
    const root = makeRepoRoot();
    seedTask(root, 'payment-refactor', LEDGER);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      error: 'Exit code 1\nboom: 7/8 passed',
      is_interrupt: false,
    });

    expect(output.hookSpecificOutput?.additionalContext).toContain(
      'unmet — expected success marker not found in output (exit 1)',
    );
  });

  it('reports an empty failure output as unmet without changing the ledger', () => {
    const root = makeRepoRoot();
    const path = seedTask(root, 'payment-refactor', LEDGER);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      error: 'Exit code 1',
      is_interrupt: false,
    });

    expect(output.hookSpecificOutput?.additionalContext).toContain(
      'unmet — no output (exit 1)',
    );
    expect(readFileSync(path, 'utf8')).toBe(LEDGER);
  });

  it('records only the selected task when two CHECKs match', () => {
    const root = makeRepoRoot();
    const paymentPath = seedTask(root, 'payment-refactor', LEDGER);
    const loginPath = seedTask(root, 'login-fix', LEDGER);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: '8/8 passed', stderr: '' },
    });

    const line = output.hookSpecificOutput?.additionalContext ?? '';
    expect(line).not.toContain('login-fix');
    expect(line).toContain('payment-refactor');
    expect(line).not.toContain('\n');
    expect(readFileSync(paymentPath, 'utf8')).toContain('- [x] G1');
    expect(readFileSync(loginPath, 'utf8')).toBe(LEDGER);
  });

  it('keeps agent provenance limited to its selected task', () => {
    const root = makeRepoRoot();
    seedTask(root, 'payment-refactor', LEDGER);
    seedTask(root, 'login-fix', LEDGER);
    activateWorkflow(root, { agent_id: 'aa8d87f5564af18d4' });

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: '8/8 passed', stderr: '' },
      agent_id: 'aa8d87f5564af18d4',
    });

    const line = output.hookSpecificOutput?.additionalContext ?? '';
    expect(line).not.toContain('login-fix');
    expect(line).toContain('payment-refactor G1 met via agent aa8d87f5');
    expect(line).not.toContain('\n');
  });

  it('reports and records regression after a formerly met gate fails', () => {
    const root = makeRepoRoot();
    const path = seedTask(root, 'payment-refactor', LEDGER);
    observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: '8/8 passed', stderr: '' },
    });

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: '7/8 passed', stderr: '' },
    });

    expect(output.hookSpecificOutput?.additionalContext).toContain(
      '(was met — regressed)',
    );
    const ledger = readFileSync(path, 'utf8');
    expect(ledger).toContain('- [ ] G1');
    expect(ledger).toContain('EVIDENCE: pending (regressed)');
  });

  it('does not inspect or change a ledger at advisory', () => {
    const root = makeRepoRoot('advisory');
    const path = seedTask(root, 'payment-refactor', LEDGER);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: '8/8 passed', stderr: '' },
    });

    expect(output.hookSpecificOutput?.additionalContext).toBeUndefined();
    expect(readFileSync(path, 'utf8')).toBe(LEDGER);
  });

  it('does not judge or change an interrupted CHECK', () => {
    const root = makeRepoRoot();
    const path = seedTask(root, 'payment-refactor', LEDGER);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      error: 'Exit code 1\nboom: 8/8 passed',
      is_interrupt: true,
    });

    expect(output.hookSpecificOutput?.additionalContext).toBeUndefined();
    expect(readFileSync(path, 'utf8')).toBe(LEDGER);
  });

  it('keeps the old third-failure line for a command with no CHECK', () => {
    const root = makeRepoRoot();
    seedTask(root, 'payment-refactor', LEDGER);
    const input: PostToolUseFailureInput = {
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: 'yarn lint' },
      error: 'Exit code 1',
      is_interrupt: false,
    };

    expect(
      observeBash(input).hookSpecificOutput?.additionalContext,
    ).toBeUndefined();
    expect(
      observeBash(input).hookSpecificOutput?.additionalContext,
    ).toBeUndefined();
    expect(observeBash(input).hookSpecificOutput?.additionalContext).toContain(
      'trace-cause',
    );
  });

  it('merges the third-failure hint into a CHECK verdict line', () => {
    const root = makeRepoRoot();
    seedTask(root, 'payment-refactor', LEDGER);
    const input: PostToolUseFailureInput = {
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      error: 'Exit code 1\nboom: 7/8 passed',
      is_interrupt: false,
    };

    observeBash(input);
    observeBash(input);
    const line = observeBash(input).hookSpecificOutput?.additionalContext ?? '';

    expect(line).toContain(
      'unmet — expected success marker not found in output (exit 1)',
    );
    expect(line).toContain('consecutive failure');
    expect(line).not.toContain('\n');
  });

  it('marks agent evidence and clears the marker on driver proof', () => {
    const root = makeRepoRoot();
    const path = seedTask(root, 'payment-refactor', LEDGER);

    activateWorkflow(root, { agent_id: 'aa8d87f5564af18d4' });
    const agentOutput = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: '8/8 passed', stderr: '' },
      agent_id: 'aa8d87f5564af18d4',
    });

    expect(agentOutput.hookSpecificOutput?.additionalContext).toContain(
      'met via agent aa8d87f5',
    );
    expect(readFileSync(path, 'utf8')).toMatch(
      /EVIDENCE: .* \(via agent aa8d87f5\)$/m,
    );

    observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      tool_response: { stdout: '8/8 passed', stderr: '' },
    });
    expect(readFileSync(path, 'utf8')).not.toContain('(via agent');
  });

  it('does not record a gate when its actor observation cannot be read', () => {
    const root = makeRepoRoot();
    const path = seedTask(root, 'payment-refactor', LEDGER);
    const sessions = portableJoin(root, '.seiri', 'sessions');
    const state = readdirSync(sessions).find((name) => name.endsWith('.json'))!;
    const statePath = portableJoin(sessions, state);
    rmSync(statePath);
    mkdirSync(statePath);

    const output = observeBash({
      cwd: root,
      session_id: SESSION,
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: COMMAND },
      error: 'Exit code 1\nboom: 8/8 passed',
      is_interrupt: false,
    });

    expect(output.hookSpecificOutput).toBeUndefined();
    expect(readFileSync(path, 'utf8')).toBe(LEDGER);
  });
});
