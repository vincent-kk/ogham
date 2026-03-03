import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

import { CONFIG_REGISTRY } from './config-registry.js';
import { metaPath } from './shared.js';

export interface ProvisionResult {
  /** Filenames that were newly created */
  created: string[];
  /** Filenames that were skipped (already exist) */
  skipped: string[];
}

export function provisionMissingConfigs(cwd: string): ProvisionResult {
  const result: ProvisionResult = { created: [], skipped: [] };

  // Ensure .maencof-meta/ exists
  const metaDir = metaPath(cwd);
  if (!existsSync(metaDir)) {
    mkdirSync(metaDir, { recursive: true });
  }

  for (const entry of CONFIG_REGISTRY) {
    const filePath = metaPath(cwd, entry.filename);
    if (existsSync(filePath)) {
      result.skipped.push(entry.filename);
    } else {
      const value = entry.defaultValue();
      writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
      result.created.push(entry.filename);
    }
  }

  return result;
}
