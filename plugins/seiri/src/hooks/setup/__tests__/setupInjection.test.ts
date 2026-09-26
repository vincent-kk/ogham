import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../../types/config.js';
import { processSessionStart } from '../setup.js';

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

function seedRepo(intervention: InterventionLevel): string {
  const cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-setup-injection-'));
  roots.push(cwd);
  mkdirSync(portableJoin(cwd, '.git'));
  writeConfig(cwd, 'project', { intervention });
  return cwd;
}

it.each(['off', 'advisory'] as const)(
  'injects nothing at %s',
  (intervention) => {
    expect(
      processSessionStart({
        cwd: seedRepo(intervention),
        session_id: 'session-a',
        prompt_id: 'turn-a',
        hook_event_name: 'SessionStart',
        source: 'startup',
      }),
    ).toEqual({ continue: true });
  },
);

it('carries the strict-only posture line at strict, absent at standard', () => {
  const strictContext = processSessionStart({
    cwd: seedRepo('strict'),
    session_id: 'session-a',
    prompt_id: 'turn-a',
    hook_event_name: 'SessionStart',
    source: 'startup',
  }).hookSpecificOutput?.additionalContext;
  expect(strictContext).toContain('Posture (strict)');

  const standardContext = processSessionStart({
    cwd: seedRepo('standard'),
    session_id: 'session-a',
    prompt_id: 'turn-a',
    hook_event_name: 'SessionStart',
    source: 'startup',
  }).hookSpecificOutput?.additionalContext;
  expect(standardContext).not.toContain('Posture');
});
