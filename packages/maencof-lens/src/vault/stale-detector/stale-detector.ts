import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { scanVault } from '@ogham/maencof';

export interface StaleInfo {
  isStale: boolean;
  indexMtime: number | null;
  newestFileMtime: number;
  staleSince?: string;
}

/**
 * Compare .maencof/index.json mtime against vault files' max mtime.
 */
export async function detectStale(vaultPath: string): Promise<StaleInfo> {
  const indexPath = join(vaultPath, '.maencof', 'index.json');

  if (!existsSync(indexPath)) {
    return { isStale: true, indexMtime: null, newestFileMtime: 0, staleSince: 'index not found' };
  }

  const indexMtime = statSync(indexPath).mtimeMs;

  try {
    const scanned = await scanVault(vaultPath);
    let newestFileMtime = 0;
    for (const file of scanned) {
      if (file.mtime > newestFileMtime) {
        newestFileMtime = file.mtime;
      }
    }

    const isStale = newestFileMtime > indexMtime;
    const result: StaleInfo = { isStale, indexMtime, newestFileMtime };

    if (isStale) {
      const diffMs = newestFileMtime - indexMtime;
      const diffMin = Math.round(diffMs / 60_000);
      result.staleSince = diffMin < 60
        ? `${diffMin}m ago`
        : `${Math.round(diffMin / 60)}h ago`;
    }

    return result;
  } catch {
    return { isStale: false, indexMtime, newestFileMtime: 0 };
  }
}
