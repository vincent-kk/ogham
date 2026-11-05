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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import * as atomicWriter from '../../../core/utils/writeAtomically.js';
import { activateWorkflow } from '../../__tests__/helpers/workflowHarness.js';
import { processUserPromptSubmit } from '../userPromptSubmit.js';

describe.each(['standard', 'strict'] as const)(
  'user-turn storage failure at %s',
  (intervention) => {
    /** Isolated repository with one active native actor. */
    let cwd: string;
    /** Actor file whose lock or contents the case controls. */
    let statePath: string;

    beforeEach(() => {
      cwd = mkdtempSync(portableJoin(tmpdir(), 'seiri-turn-storage-'));
      mkdirSync(portableJoin(cwd, '.git'));
      writeConfig(cwd, 'project', { intervention });
      activateWorkflow(cwd);
      const sessions = portableJoin(cwd, '.seiri', 'sessions');
      const actors = readdirSync(sessions).filter((name) =>
        name.endsWith('.json'),
      );
      expect(actors).toHaveLength(1);
      statePath = portableJoin(sessions, actors[0]);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      rmSync(cwd, { recursive: true, force: true });
    });

    it('stays silent when the actor lock is unavailable', () => {
      mkdirSync(`${statePath}.lock`);

      expect(
        processUserPromptSubmit({
          cwd,
          session_id: 'session-a',
          prompt_id: 'turn-b',
          hook_event_name: 'UserPromptSubmit',
        }),
      ).toEqual({ continue: true });
    });

    it('stays silent when actor and revocation writes fail', () => {
      vi.spyOn(atomicWriter, 'writeAtomically').mockImplementation(() => {
        throw new Error('storage unavailable');
      });

      expect(
        processUserPromptSubmit({
          cwd,
          session_id: 'session-a',
          prompt_id: 'turn-b',
          hook_event_name: 'UserPromptSubmit',
        }),
      ).toEqual({ continue: true });
    });

    it.each(['corrupt', 'expired'] as const)(
      'keeps entry guidance for %s actor state',
      (state) => {
        const now = Date.now();
        if (state === 'corrupt') writeFileSync(statePath, '{');
        else {
          const actor = JSON.parse(readFileSync(statePath, 'utf8'));
          actor.lastObservedAt = now - 8 * 24 * 60 * 60 * 1000;
          writeFileSync(statePath, JSON.stringify(actor));
        }

        expect(
          processUserPromptSubmit(
            {
              cwd,
              session_id: 'session-a',
              prompt_id: 'turn-b',
              hook_event_name: 'UserPromptSubmit',
            },
            undefined,
            now,
          ).hookSpecificOutput?.additionalContext,
        ).toContain('No task bound. Before editing:');
      },
    );
  },
);
