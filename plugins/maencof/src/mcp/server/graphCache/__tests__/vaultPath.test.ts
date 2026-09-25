import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { canonicalizeTargetPathSync } from '@ogham/cross-platform';
import { afterEach, expect, it, vi } from 'vitest';

import { getVaultPath } from '../index.js';

afterEach(() => vi.unstubAllEnvs());

it('keeps the explicit init root even when server CWD and host workspace differ', () => {
  const root = resolve(tmpdir(), '지식 공간');
  vi.stubEnv('MAENCOF_VAULT_PATH', root);
  vi.stubEnv('OGHAM_HOST', 'codex');
  vi.stubEnv('CODEX_WORKSPACE_ROOT', resolve(tmpdir(), 'other-workspace'));
  expect(getVaultPath()).toBe(canonicalizeTargetPathSync(process.cwd(), root));
});
