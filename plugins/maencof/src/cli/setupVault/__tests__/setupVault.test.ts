import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runSetupVault } from '../index.js';

describe('project vault connection', () => {
  let root: string;
  let vault: string;
  let bundlePath: string;
  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'maencof-setup-')));
    vault = join(root, '지식 공간\\child');
    const bridge = join(root, 'plugin', 'bridge');
    await mkdir(vault, { recursive: true });
    await mkdir(bridge, { recursive: true });
    bundlePath = join(bridge, 'setup-vault.cjs');
    await writeFile(join(bridge, 'mcp-server.cjs'), '');
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.each(['claude', 'codex'] as const)(
    'previews, applies and repeats for %s',
    async (host) => {
      const options = { host, vaultRoot: vault, bundlePath };
      const target =
        host === 'claude'
          ? join(vault, '.mcp.json')
          : join(vault, '.codex/config.toml');
      expect((await runSetupVault(options)).ok).toBe(true);
      await expect(readFile(target)).rejects.toThrow();
      expect((await runSetupVault({ ...options, apply: true })).ok).toBe(true);
      const text = await readFile(target, 'utf8');
      expect(text).toContain(JSON.stringify(vault));
      expect(text).toContain('mcp-server.cjs');
      expect((await runSetupVault({ ...options, apply: true })).ok).toBe(true);
      expect(await readFile(target, 'utf8')).toBe(text);
    },
  );
  it('preserves unrelated Claude servers and rejects a foreign maencof server', async () => {
    const target = join(vault, '.mcp.json');
    const contents = JSON.stringify({
      mcpServers: {
        unrelated: { command: 'existing' },
        maencof: { command: 'foreign' },
      },
    });
    await writeFile(target, contents);
    const result = await runSetupVault({
      host: 'claude',
      vaultRoot: vault,
      bundlePath,
      apply: true,
    });
    expect(result.ok).toBe(false);
    expect(await readFile(target, 'utf8')).toBe(contents);
  });
  it('rejects drift without exposing the edited environment', async () => {
    const options = {
      host: 'claude' as const,
      vaultRoot: vault,
      bundlePath,
      apply: true,
    };
    await runSetupVault(options);
    const target = join(vault, '.mcp.json');
    const changed = (await readFile(target, 'utf8')).replace(
      'MAENCOF_VAULT_PATH',
      'PRIVATE_ENVIRONMENT',
    );
    await writeFile(target, changed);
    const result = await runSetupVault(options);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('PRIVATE_ENVIRONMENT');
    expect(await readFile(target, 'utf8')).toBe(changed);
  });
  it('rejects relative roots and absent distributed server', async () => {
    await expect(
      runSetupVault({ host: 'claude', vaultRoot: '.', bundlePath }),
    ).rejects.toThrow(/absolute/i);
    await expect(
      runSetupVault({
        host: 'claude',
        vaultRoot: vault,
        bundlePath: join(root, 'absent/cli.cjs'),
      }),
    ).rejects.toThrow();
  });
});
