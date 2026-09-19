import { readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { DEFAULT_SCAN_OPTIONS } from '../../../../constants/scanDefaults.js';
import { createIgnoreFilter } from '../../../../lib/createIgnoreFilter.js';
import type { ScanOptions } from '../../../../types/scan.js';

import { discoverDirectories } from './discoverDirectories.js';

/**
 * Every file the project scan collects, as one flat list.
 *
 * The set is the union of what `collectNodeMetadata` records as `peerFiles`,
 * produced by the same discovery and the same ignore filter so the two cannot
 * drift apart. Entry names are used as the filesystem spells them — no
 * `pathForCompare` — because a rename that changes only case has to read as a
 * different list.
 *
 * @param rootPath - Project root to scan; resolved before traversal.
 * @param options - Scan options; omitted fields fall back to the built-in
 * defaults, so a caller that passes nothing scans what `scanProject` scans.
 * @returns Project-relative POSIX paths, sorted by raw UTF-8 bytes.
 */
export async function listScannedFilePaths(
  rootPath: string,
  options?: ScanOptions,
): Promise<string[]> {
  const absoluteRoot = resolve(rootPath);
  const opts: Required<ScanOptions> = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const isIgnored = createIgnoreFilter(absoluteRoot);
  const directories = await discoverDirectories(absoluteRoot, opts, isIgnored);
  const paths = directories.flatMap((directory) =>
    readdirSync(directory, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          !entry.name.startsWith('.') &&
          !isIgnored(join(directory, entry.name)),
      )
      .map((entry) =>
        relative(absoluteRoot, join(directory, entry.name))
          .split(sep)
          .join('/'),
      ),
  );
  return paths.sort((left, right) =>
    Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')),
  );
}
