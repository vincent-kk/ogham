import { type Dirent, readdirSync, realpathSync } from 'node:fs';
import { extname, join } from 'node:path';

import { createIgnoreFilter } from '../../../../lib/createIgnoreFilter.js';
import {
  EXCLUDED_DIRECTORY_NAMES,
  SOURCE_EXTENSIONS,
} from '../ecmascriptConventions.js';

import { isLinkOutside } from './isLinkOutside.js';

/** What one walk of the source tree found. */
export interface SourceTreeWalk {
  /** Regular source files, in walk order. */
  files: string[];
  /** Symbolic links the walk did not follow whose real location is outside the root. */
  unfollowedLinks: string[];
}

/**
 * Whether a directory entry names a source file by its extension.
 * @param entry Directory entry.
 * @returns True for a supported source extension.
 */
function hasSourceExtension(entry: Dirent): boolean {
  return SOURCE_EXTENSIONS.includes(
    extname(entry.name) as (typeof SOURCE_EXTENSIONS)[number],
  );
}

/**
 * Walk the project's source tree without following symbolic links.
 *
 * Ignored paths and excluded directory names are skipped. A symbolic link to a
 * source file or to a directory is never followed; when its real location is
 * outside the root it is reported, since whatever it holds is invisible to the
 * analysis. A link that stays inside needs no report — its target is walked
 * under its real path — and a dangling link or a loop holds nothing to miss.
 * @param projectRoot Absolute project root.
 * @returns Source files and outside-pointing links, each in sorted walk order.
 */
export function walkSourceTree(projectRoot: string): SourceTreeWalk {
  const isIgnored = createIgnoreFilter(projectRoot);
  const realRoot = realpathSync(projectRoot);
  const walk: SourceTreeWalk = { files: [], unfollowedLinks: [] };
  const visit = (directoryPath: string): void => {
    const entries = readdirSync(directoryPath, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const path = join(directoryPath, entry.name);
      if (isIgnored(path)) continue;
      if (entry.isSymbolicLink()) {
        if (
          !EXCLUDED_DIRECTORY_NAMES.has(entry.name) &&
          isLinkOutside(realRoot, path, hasSourceExtension(entry))
        )
          walk.unfollowedLinks.push(path);
        continue;
      }
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) visit(path);
        continue;
      }
      if (entry.isFile() && hasSourceExtension(entry)) walk.files.push(path);
    }
  };
  visit(projectRoot);
  return walk;
}
