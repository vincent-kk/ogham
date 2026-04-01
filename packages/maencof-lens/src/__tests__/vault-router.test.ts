import { describe, expect, it } from 'vitest';

import type { LensConfig } from '../config/config-schema.js';
import { VaultRouter } from '../vault/vault-router.js';

const twoVaultConfig: LensConfig = {
  version: '1.0',
  vaults: [
    { name: 'personal', path: '/vault/personal', layers: [2, 3, 4, 5], default: true },
    { name: 'work', path: '/vault/work', layers: [3, 4], default: false },
  ],
};

describe('VaultRouter', () => {
  it('resolves vault by name', () => {
    const router = new VaultRouter(twoVaultConfig);
    const vault = router.resolve('work');
    expect(vault.name).toBe('work');
    expect(vault.path).toBe('/vault/work');
  });

  it('returns default vault when name omitted', () => {
    const router = new VaultRouter(twoVaultConfig);
    const vault = router.resolve();
    expect(vault.name).toBe('personal');
  });

  it('returns first vault when no default is marked', () => {
    const config: LensConfig = {
      version: '1.0',
      vaults: [
        { name: 'a', path: '/a', layers: [2, 3], default: false },
        { name: 'b', path: '/b', layers: [3, 4], default: false },
      ],
    };
    const router = new VaultRouter(config);
    expect(router.resolve().name).toBe('a');
  });

  it('throws descriptive error for unknown vault', () => {
    const router = new VaultRouter(twoVaultConfig);
    expect(() => router.resolve('nonexistent')).toThrow('Unknown vault: "nonexistent"');
    expect(() => router.resolve('nonexistent')).toThrow('personal, work');
  });

  it('lists all vaults', () => {
    const router = new VaultRouter(twoVaultConfig);
    expect(router.listVaults()).toHaveLength(2);
  });
});
