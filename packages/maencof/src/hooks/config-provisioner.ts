import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { CONFIG_REGISTRY } from './config-registry.js';
import { metaPath } from './shared.js';

export interface ProvisionResult {
  /** Filenames that were newly created */
  created: string[];
  /** Filenames that were skipped (already exist and up-to-date) */
  skipped: string[];
  /** Filenames that were migrated (schema updated) */
  migrated: string[];
}

function additiveMerge(
  existing: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in merged)) {
      merged[key] = value; // top-level only, no nested deep merge
    }
  }
  merged._schemaVersion = defaults._schemaVersion;
  return merged;
}

export function provisionMissingConfigs(cwd: string): ProvisionResult {
  const result: ProvisionResult = { created: [], skipped: [], migrated: [] };

  // Ensure .maencof-meta/ exists
  const metaDir = metaPath(cwd);
  if (!existsSync(metaDir)) {
    mkdirSync(metaDir, { recursive: true });
  }

  for (const entry of CONFIG_REGISTRY) {
    const filePath = metaPath(cwd, entry.filename);
    if (!existsSync(filePath)) {
      // Provision: create new file
      const value = entry.defaultValue();
      writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
      result.created.push(entry.filename);
    } else if (entry.schemaVersion != null) {
      // Migration: check if stale
      try {
        const existing = JSON.parse(readFileSync(filePath, 'utf-8')) as Record<
          string,
          unknown
        >;
        const currentVersion =
          (existing._schemaVersion as number | undefined) ?? 0;
        if (currentVersion < entry.schemaVersion) {
          const defaults = entry.defaultValue();
          const merged = additiveMerge(existing, defaults);
          writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
          result.migrated.push(entry.filename);
        } else {
          result.skipped.push(entry.filename);
        }
      } catch {
        result.skipped.push(entry.filename); // corrupted -> skip
      }
    } else {
      result.skipped.push(entry.filename); // no schemaVersion -> skip
    }
  }

  return result;
}
