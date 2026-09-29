import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../../types/config.js';
import { processUserPromptSubmit } from '../userPromptSubmit.js';

/** Isolated projects owned by this suite. */
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/** Create a project whose dial is independent of the user's settings. */
function seedRepo(intervention: InterventionLevel): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-turn-'));
  roots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  writeConfig(root, 'project', { intervention });
  return root;
}

describe('user-turn boundary', () => {
  it.each(['off', 'advisory'] as const)(
    'stays silent at %s',
    (intervention) => {
      expect(
        processUserPromptSubmit({
          cwd: seedRepo(intervention),
          session_id: 'session-a',
          prompt_id: 'turn-a',
          hook_event_name: 'UserPromptSubmit',
        }),
      ).toEqual({ continue: true });
    },
  );

  it('states the standard entry line without creating an actor file', () => {
    const cwd = seedRepo('standard');
    expect(
      processUserPromptSubmit({
        cwd,
        session_id: 'session-a',
        prompt_id: 'turn-a',
        hook_event_name: 'UserPromptSubmit',
      }).hookSpecificOutput?.additionalContext,
    ).toContain(
      '[seiri] No task bound. Before editing: a behavior change to source or tests',
    );
    expect(existsSync(portableJoin(cwd, '.seiri', 'sessions'))).toBe(false);
  });

  it('states the strict entry line with no binding', () => {
    const context = processUserPromptSubmit({
      cwd: seedRepo('strict'),
      session_id: 'session-a',
      prompt_id: 'turn-a',
      hook_event_name: 'UserPromptSubmit',
    }).hookSpecificOutput?.additionalContext;
    expect(context).toContain(
      'No task bound. Before editing: a behavior change to source or tests',
    );
    expect(context).toContain('checked by seiri:review-plan');
    expect(context).not.toContain('Workflow:');
  });

  it.each(['I am done', 'Review this plan', 'The test failed'])(
    'does not choose a workflow from the prompt: %s',
    (prompt) => {
      expect(
        processUserPromptSubmit({
          cwd: seedRepo('strict'),
          session_id: 'session-a',
          prompt_id: 'turn-a',
          hook_event_name: 'UserPromptSubmit',
          prompt,
        }).hookSpecificOutput?.additionalContext,
      ).toContain('No task bound. Before editing:');
    },
  );

  it('never blocks a turn when cwd is missing', () => {
    expect(
      processUserPromptSubmit({
        cwd: '',
        session_id: 'session-a',
        prompt_id: 'turn-a',
        hook_event_name: 'UserPromptSubmit',
      }),
    ).toEqual({ continue: true });
  });
});
