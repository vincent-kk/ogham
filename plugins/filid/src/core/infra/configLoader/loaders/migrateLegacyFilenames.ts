import { existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';

import type { RuleDocsManifest } from './manifestTypes.js';

const log = createLogger('config-loader');

/**
 * Rename old-named rule doc files (e.g. fca.md → filid_fca-policy.md) to
 * their current manifest filename, so the main sync loop sees them under
 * the current name. User edits are preserved because `renameSync` is a
 * metadata-only operation (no content rewrite).
 */
export function migrateLegacyFilenames(
  manifest: RuleDocsManifest,
  rulesDir: string,
): void {
  for (const entry of manifest.rules) {
    if (!entry.legacyFilename) continue;
    const legacyPath = join(rulesDir, entry.legacyFilename);
    const newPath = join(rulesDir, entry.filename);
    if (existsSync(legacyPath) && !existsSync(newPath))
      try {
        renameSync(legacyPath, newPath);
        log.debug(
          `migrated rule doc: ${entry.legacyFilename} → ${entry.filename}`,
        );
      } catch (err) {
        log.error(`failed to migrate ${entry.legacyFilename}`, err);
      }
  }
}
