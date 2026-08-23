/**
 * @file cwdGuard.test.ts
 * @description Direct getVaultPath canonical host-state boundary tests.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';

import { canonicalizeTargetPathSync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getVaultPath } from '../../mcp/server/graphCache/index.js';

type GuardHost = 'claude' | 'codex';

let root: string;
let stateRoots: Record<GuardHost, string>;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'maencof-cwd-guard-'));
  stateRoots = {
    claude: join(root, 'home', '.claude'),
    codex: join(root, 'home', '.codex'),
  };
  mkdirSync(stateRoots.claude, { recursive: true });
  mkdirSync(stateRoots.codex, { recursive: true });
  vi.stubEnv('CLAUDE_CONFIG_DIR', stateRoots.claude);
  vi.stubEnv('CODEX_HOME', stateRoots.codex);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

function setVault(path: string): void {
  vi.stubEnv('MAENCOF_VAULT_PATH', path);
}

describe.each(['claude', 'codex'] as const)('%s host state root', (host) => {
  it('blocks the exact relocated host root', () => {
    setVault(stateRoots[host]);
    expect(() => getVaultPath()).toThrow('global config path');
  });

  it('blocks descendants of the relocated host root', () => {
    const descendant = join(stateRoots[host], 'agents', 'nested');
    mkdirSync(descendant, { recursive: true });
    setVault(descendant);
    expect(() => getVaultPath()).toThrow('global config path');
  });

  it('allows a sibling whose name only shares the root prefix', () => {
    const sibling = `${stateRoots[host]}-project`;
    mkdirSync(sibling, { recursive: true });
    setVault(sibling);
    expect(getVaultPath()).toBe(
      canonicalizeTargetPathSync(process.cwd(), sibling),
    );
  });

  it('blocks a relative path that resolves to the host root', () => {
    setVault(relative(process.cwd(), stateRoots[host]));
    expect(() => getVaultPath()).toThrow('global config path');
  });

  it('blocks dot-dot traversal into the host root', () => {
    const traversal = join(
      stateRoots[host],
      '..',
      basename(stateRoots[host]),
      'agents',
    );
    mkdirSync(resolve(traversal), { recursive: true });
    setVault(traversal);
    expect(() => getVaultPath()).toThrow('global config path');
  });

  it('blocks a symlink alias to the host root', () => {
    const alias = join(root, `${host}-alias`);
    symlinkSync(stateRoots[host], alias, 'dir');
    setVault(alias);
    expect(() => getVaultPath()).toThrow('global config path');
  });
});

describe('legacy global config root', () => {
  it('continues to block the exact ~/.config root', () => {
    setVault(join(homedir(), '.config'));
    expect(() => getVaultPath()).toThrow('global config path');
  });

  it('continues to block descendants of ~/.config', () => {
    setVault(join(homedir(), '.config', 'maencof', 'nested'));
    expect(() => getVaultPath()).toThrow('global config path');
  });
});

describe('vault selection defaults', () => {
  it('allows an ordinary project path', () => {
    const project = join(root, 'project');
    mkdirSync(project);
    setVault(project);

    expect(getVaultPath()).toBe(
      canonicalizeTargetPathSync(process.cwd(), project),
    );
  });

  it('uses the current working directory when MAENCOF_VAULT_PATH is absent', () => {
    delete process.env['MAENCOF_VAULT_PATH'];

    expect(getVaultPath()).toBe(
      canonicalizeTargetPathSync(process.cwd(), process.cwd()),
    );
  });
});
