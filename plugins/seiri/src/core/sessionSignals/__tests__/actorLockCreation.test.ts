import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { expect, it, vi } from 'vitest';

import { withWorkflowState } from '../workflow/withWorkflowState.js';

it('skips actor preparation and mutation when the existing directory has a held actor lock', () => {
  const root = mkdtempSync(
    portableJoin(tmpdir(), 'seiri-actor-creation-lock-'),
  );
  try {
    const directory = portableJoin(root, '.seiri', 'sessions');
    mkdirSync(portableJoin(directory, 'actor.json.lock'), { recursive: true });
    const prepare = vi.fn(() => directory);
    const mutate = vi.fn();

    expect(
      withWorkflowState({ root, actor: 'actor' }, prepare, Date.now(), mutate),
    ).toBeUndefined();
    expect(prepare).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
