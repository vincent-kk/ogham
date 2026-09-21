import { portableBasename } from '@ogham/cross-platform';

import { relatedSubtree } from './relatedSubtree.js';
import type { RelevanceTarget } from './relevanceTarget.js';

/**
 * The names a reference to one of the targets is likely to spell.
 *
 * A plain file answers to its stem — the basename without its last extension,
 * since an ecosystem may spell the extension differently or drop it. A module
 * index answers only to its directory's name: a reference that does not spell
 * it (`'.'`, `'./index'`, `'..'`) comes from inside that directory's subtree,
 * which is related anyway, and an index stem is too common to filter by. A
 * directory answers to its own name.
 * @param targets Units the names come from.
 * @returns Unique non-empty names in first-seen order.
 */
export function collectTargetNames(
  targets: readonly RelevanceTarget[],
): string[] {
  const names = targets.map(({ path, kind }) => {
    if (kind !== 'file')
      return portableBasename(relatedSubtree({ path, kind }));
    const name = portableBasename(path);
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
  });
  return [...new Set(names.filter((name) => name !== '' && name !== '.'))];
}
