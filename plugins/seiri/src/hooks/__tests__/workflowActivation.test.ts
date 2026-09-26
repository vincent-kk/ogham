import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { processToolOutcome } from '../postToolUse/postToolUse.js';
import { processSessionStart } from '../setup/setup.js';
import { processUserPromptSubmit } from '../userPromptSubmit/userPromptSubmit.js';

const roots: string[] = [];
function fixture() {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-activation-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  mkdirSync(portableJoin(cwd, '.seiri'));
  writeFileSync(
    portableJoin(cwd, '.seiri/config.json'),
    '{"intervention":"standard"}',
  );
  return { cwd, session_id: 'session', prompt_id: 'turn' };
}
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it('does not elect skills at a new user turn', () => {
  expect(
    processUserPromptSubmit({
      ...fixture(),
      hook_event_name: 'UserPromptSubmit',
    }),
  ).toEqual({ continue: true });
});
it('states the election and chain at session start', () => {
  const context = processSessionStart({
    ...fixture(),
    hook_event_name: 'SessionStart',
    source: 'startup',
  }).hookSpecificOutput?.additionalContext;
  expect(context).toContain('Election:');
  expect(context).toContain('Workflow: seiri:write-plan');
});
it('does not record a ledger outside an explicitly bound workflow', () => {
  const input = fixture();
  const dir = portableJoin(input.cwd, '.seiri/tasks/unrelated');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    portableJoin(dir, 'gates.md'),
    '- [ ] G1: check\n  CHECK: echo OK\n  EXPECT: OK\n',
  );
  expect(
    processToolOutcome({
      ...input,
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'echo OK' },
      tool_response: 'OK',
    }),
  ).toEqual({ continue: true });
});
