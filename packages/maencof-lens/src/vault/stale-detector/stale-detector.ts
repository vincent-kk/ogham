import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface StaleInfo {
  isStale: boolean;
  indexMtime: number | null;
  newestFileMtime: number;
  staleSince?: string;
}

const SKIP_DIRS = new Set([
  '.maencof',
  '.maencof-meta',
  '.maencof-lens',
  '.git',
  'node_modules',
]);

function maxMarkdownMtime(root: string): number {
  let max = 0;
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const m = statSync(fullPath).mtimeMs;
          if (m > max) max = m;
        } catch {
          // skip unreadable files
        }
      }
    }
  }
  return max;
}

/**
 * Compare .maencof/index.json mtime against vault markdown files' max mtime.
 * Walks the vault tree using node:fs builtins only (no fast-glob) so the
 * hook bundle stays free of glob-runtime deps. Hidden directories and
 * known config dirs are skipped.
 */
export async function detectStale(vaultPath: string): Promise<StaleInfo> {
  const indexPath = join(vaultPath, '.maencof', 'index.json');

  if (!existsSync(indexPath)) {
    return { isStale: true, indexMtime: null, newestFileMtime: 0, staleSince: 'index not found' };
  }

  const indexMtime = statSync(indexPath).mtimeMs;

  try {
    const newestFileMtime = maxMarkdownMtime(vaultPath);
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
