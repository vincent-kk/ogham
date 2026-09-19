import { portableDirname, samePath } from '@ogham/cross-platform';

import type { FractalTree } from '../../../../types/fractal.js';

import type { RelevanceTarget } from './relevanceTarget.js';

/**
 * The relevance kind of a unit, from the adapter's own entry evidence.
 *
 * A file is a module index when the adapter reported it as the `module` entry
 * of its directory's node; core knows no entry file name of its own.
 * @param tree Snapshot tree whose nodes carry the adapter's entry points.
 * @param absolutePath Absolute path of the unit.
 * @param isDirectory Whether the unit is a directory.
 * @returns `directory`, `module-index` or `file`.
 */
export function classifyRelevanceTarget(
  tree: FractalTree,
  absolutePath: string,
  isDirectory: boolean,
): RelevanceTarget['kind'] {
  if (isDirectory) return 'directory';
  const node = [...tree.nodes.values()].find(({ path }) =>
    samePath(path, portableDirname(absolutePath)),
  );
  return node?.entryPoints.some(
    (entryPoint) =>
      entryPoint.kind === 'module' && samePath(entryPoint.path, absolutePath),
  )
    ? 'module-index'
    : 'file';
}
