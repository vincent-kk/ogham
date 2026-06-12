import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HARVEST_DIR } from '../../constants/spikeMode.js';
import { normalizeBranch } from '../../lib/normalizeBranch.js';

import { findConfigRoot } from './findConfigRoot.js';

export interface HarvestManifest {
  base_sha?: string;
  head_sha?: string;
  diff_hash?: string;
  criteria_delta_hash?: string;
  created_at?: string;
}

const MANIFEST_KEYS = [
  'base_sha',
  'head_sha',
  'diff_hash',
  'criteria_delta_hash',
  'created_at',
] as const;

/**
 * Read `.filid/harvest/<normalized-branch>/manifest.json` without zod
 * (hook bundle budget). Per-field sanitize: non-string fields are dropped so
 * callers graceful-degrade. Returns null when the manifest is absent or
 * unparsable. Validity (head_sha == current HEAD) is the caller's judgment.
 */
export function readHarvestManifest(
  cwd: string,
  branch: string,
): HarvestManifest | null {
  const root = findConfigRoot(cwd) ?? cwd;
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(
        join(root, HARVEST_DIR, normalizeBranch(branch), 'manifest.json'),
        'utf-8',
      ),
    );
    if (typeof parsed !== 'object' || parsed === null) return null;
    const raw = parsed as Record<string, unknown>;
    const manifest: HarvestManifest = {};
    for (const key of MANIFEST_KEYS) {
      const value = raw[key];
      if (typeof value === 'string') manifest[key] = value;
    }
    return manifest;
  } catch {
    return null;
  }
}
