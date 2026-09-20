/**
 * @file walkSourceTree.ts
 * @description Reads the request-scoped memo opened by `runWithRequestMemo`,
 * which cannot be passed in: the adapter interface between that scope and this
 * function carries no cache. With no scope open the tree is walked on every
 * call.
 */
import { type Dirent, readdirSync, realpathSync } from 'node:fs';
import { extname, join } from 'node:path';

import { createIgnoreFilter } from '../../../../lib/createIgnoreFilter.js';
import { memoizeWithinRequest } from '../../../../lib/memoizeWithinRequest.js';
import {
  EXCLUDED_DIRECTORY_NAMES,
  SOURCE_EXTENSIONS,
} from '../ecmascriptConventions.js';

import { isLinkOutside } from './isLinkOutside.js';

/**
 * Memo namespace. The key is the root exactly as the caller spelled it: every
 * path in the walk is built by joining onto that spelling, so a resolved key
 * would hand one caller another's spelling.
 */
const MEMO_NAMESPACE = 'walkSourceTree';

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
  const walk = memoizeWithinRequest(
    MEMO_NAMESPACE,
    projectRoot,
    (): SourceTreeWalk => {
      const isIgnored = createIgnoreFilter(projectRoot);
      const realRoot = realpathSync(projectRoot);
      const found: SourceTreeWalk = { files: [], unfollowedLinks: [] };
      const visit = (directoryPath: string): void => {
        const entries = readdirSync(directoryPath, {
          withFileTypes: true,
        }).sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
          const path = join(directoryPath, entry.name);
          if (isIgnored(path)) continue;
          if (entry.isSymbolicLink()) {
            if (
              !EXCLUDED_DIRECTORY_NAMES.has(entry.name) &&
              isLinkOutside(realRoot, path, hasSourceExtension(entry))
            )
              found.unfollowedLinks.push(path);
            continue;
          }
          if (entry.isDirectory()) {
            if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) visit(path);
            continue;
          }
          if (entry.isFile() && hasSourceExtension(entry))
            found.files.push(path);
        }
      };
      visit(projectRoot);
      return found;
    },
  );
  return { files: [...walk.files], unfollowedLinks: [...walk.unfollowedLinks] };
}
