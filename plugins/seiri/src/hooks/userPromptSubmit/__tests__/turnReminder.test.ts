import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  TURN_REMINDER_STANDARD,
  TURN_REMINDER_STRICT,
} from '../../../constants/hooks.js';
import { INJECTION_PREFIX } from '../../../constants/plugin.js';
import { writeConfig } from '../../../core/infra/configLoader/loaders/writeConfig.js';
import type { InterventionLevel } from '../../../types/config.js';
import { processUserPromptSubmit } from '../userPromptSubmit.js';

/**
 * The per-turn dispatch reminder. Its safety rests on staying silent at
 * advisory — the level the dispatch rates were measured against — so the
 * cases that matter are that advisory injects nothing and that each raised
 * dial carries its own line: standard reminding, strict widening. The hook
 * reads only the dial, so a temp repo with a written config is the whole
 * fixture.
 */
describe('per-turn dispatch reminder', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(intervention: InterventionLevel): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-turn-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    writeConfig(repoRoot, { intervention });
    return repoRoot;
  }

  function remind(cwd: string): string | undefined {
    const output = processUserPromptSubmit({
      cwd,
      session_id: 'session-a',
      hook_event_name: 'UserPromptSubmit',
    });
    expect(output.continue).toBe(true);
    return output.hookSpecificOutput?.additionalContext;
  }

  it('injects nothing at advisory — the measured baseline stays intact', () => {
    expect(remind(seedRepo('advisory'))).toBeUndefined();
  });

  it('reminds with the standard line from standard up', () => {
    expect(remind(seedRepo('standard'))).toBe(
      `${INJECTION_PREFIX} ${TURN_REMINDER_STANDARD}`,
    );
  });

  it('widens to the strict line at strict', () => {
    expect(remind(seedRepo('strict'))).toBe(
      `${INJECTION_PREFIX} ${TURN_REMINDER_STRICT}`,
    );
  });

  it('gives standard and strict distinct lines', () => {
    expect(TURN_REMINDER_STANDARD).not.toBe(TURN_REMINDER_STRICT);
  });

  it('leads both lines with skill dispatch — the failure it closes', () => {
    expect(TURN_REMINDER_STANDARD.toLowerCase()).toContain('skill');
    expect(TURN_REMINDER_STRICT.toLowerCase()).toContain('skill');
  });

  it('never blocks a turn when cwd is missing', () => {
    const output = processUserPromptSubmit({
      cwd: '',
      session_id: 'session-a',
      hook_event_name: 'UserPromptSubmit',
    });
    expect(output.continue).toBe(true);
    expect(output.hookSpecificOutput).toBeUndefined();
  });
});
