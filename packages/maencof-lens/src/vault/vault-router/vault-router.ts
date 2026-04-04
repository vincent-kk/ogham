import type { LensConfig, VaultConfig } from '../../config/config-schema/config-schema.js';

/**
 * Multi-vault name→config resolution.
 */
export class VaultRouter {
  private readonly vaults: VaultConfig[];
  private readonly defaultVault: VaultConfig;

  constructor(config: LensConfig) {
    this.vaults = config.vaults;
    this.defaultVault =
      config.vaults.find((v) => v.default) ?? config.vaults[0];
  }

  /** Resolve vault by name. If name omitted, returns default vault. */
  resolve(vaultName?: string): VaultConfig {
    if (!vaultName) return this.defaultVault;

    const found = this.vaults.find((v) => v.name === vaultName);
    if (!found) {
      const available = this.vaults.map((v) => v.name).join(', ');
      throw new Error(
        `Unknown vault: "${vaultName}". Available: ${available}`,
      );
    }
    return found;
  }

  /** Get default vault config. */
  getDefault(): VaultConfig {
    return this.defaultVault;
  }

  /** List all registered vaults. */
  listVaults(): VaultConfig[] {
    return this.vaults;
  }
}
