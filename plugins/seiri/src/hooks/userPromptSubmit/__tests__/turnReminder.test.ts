import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../../types/config.js';
import { renderChainLine } from '../../shared/progressLine/renderChainLine.js';
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

describe('silent user-turn boundary', () => {
  it.each(['off', 'advisory', 'standard'] as const)(
    'does not elect skills at %s',
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

  it('falls back to the chain line at strict with no active binding', () => {
    expect(
      processUserPromptSubmit({
        cwd: seedRepo('strict'),
        session_id: 'session-a',
        prompt_id: 'turn-a',
        hook_event_name: 'UserPromptSubmit',
      }).hookSpecificOutput?.additionalContext,
    ).toBe(renderChainLine());
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
      ).toBe(renderChainLine());
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
