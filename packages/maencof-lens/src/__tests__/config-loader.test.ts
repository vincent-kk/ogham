import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig, writeConfig, createDefaultConfig } from '../config/config-loader.js';
import { LensConfigSchema } from '../config/config-schema.js';

describe('config-loader', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `maencof-lens-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // --- Basic (happy path) ---
  it('loads a valid config', () => {
    const configDir = join(testDir, '.maencof-lens');
    mkdirSync(configDir);
    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify({
        version: '1.0',
        vaults: [{ name: 'test', path: '/tmp/vault', layers: [2, 3], default: true }],
      }),
    );
    const config = loadConfig(testDir);
    expect(config).not.toBeNull();
    expect(config!.vaults).toHaveLength(1);
    expect(config!.vaults[0].name).toBe('test');
    expect(config!.vaults[0].layers).toEqual([2, 3]);
  });

  it('returns null when config does not exist', () => {
    expect(loadConfig(testDir)).toBeNull();
  });

  it('writeConfig creates directory and writes valid JSON', () => {
    const config = createDefaultConfig('/tmp/vault', 'my-vault');
    writeConfig(testDir, config);
    const loaded = loadConfig(testDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.vaults[0].name).toBe('my-vault');
  });

  // --- Edge cases ---
  it('returns null for invalid JSON', () => {
    const configDir = join(testDir, '.maencof-lens');
    mkdirSync(configDir);
    writeFileSync(join(configDir, 'config.json'), 'not json');
    expect(loadConfig(testDir)).toBeNull();
  });

  it('returns null for empty vaults array', () => {
    const configDir = join(testDir, '.maencof-lens');
    mkdirSync(configDir);
    writeFileSync(join(configDir, 'config.json'), JSON.stringify({ version: '1.0', vaults: [] }));
    expect(loadConfig(testDir)).toBeNull();
  });

  it('returns null when vault name is missing', () => {
    const configDir = join(testDir, '.maencof-lens');
    mkdirSync(configDir);
    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify({ version: '1.0', vaults: [{ path: '/tmp', layers: [2] }] }),
    );
    expect(loadConfig(testDir)).toBeNull();
  });

  it('rejects layer outside 1-5 range', () => {
    const result = LensConfigSchema.safeParse({
      version: '1.0',
      vaults: [{ name: 'bad', path: '/tmp', layers: [0, 6] }],
    });
    expect(result.success).toBe(false);
  });

  it('applies default layers [2,3,4,5] when layers omitted', () => {
    const configDir = join(testDir, '.maencof-lens');
    mkdirSync(configDir);
    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify({ version: '1.0', vaults: [{ name: 'v', path: '/tmp' }] }),
    );
    const config = loadConfig(testDir);
    expect(config!.vaults[0].layers).toEqual([2, 3, 4, 5]);
  });

  it('applies default version when version omitted', () => {
    const configDir = join(testDir, '.maencof-lens');
    mkdirSync(configDir);
    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify({ vaults: [{ name: 'v', path: '/tmp' }] }),
    );
    const config = loadConfig(testDir);
    expect(config!.version).toBe('1.0');
  });

  it('createDefaultConfig produces schema-valid config', () => {
    const config = createDefaultConfig('/home/user/vault', 'personal');
    const result = LensConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    expect(config.vaults[0].default).toBe(true);
  });
});
