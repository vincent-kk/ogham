import {
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
} from '@ogham/cross-platform';

import type { FractalTree } from '../../../types/fractal.js';

export function resolveSnapshotOwner(
  tree: FractalTree,
  targetPath: string,
): string | null {
  return (
    [...tree.nodes.values()]
      .filter((node) => node.type !== 'organ')
      .sort((left, right) => right.path.length - left.path.length)
      .find((node) => {
        const remainder = portableRelative(node.path, targetPath);
        const comparable = pathForCompare(remainder);
        return (
          remainder === '' ||
          (comparable !== '..' &&
            !comparable.startsWith('../') &&
            !portableIsAbsolute(remainder))
        );
      })?.path ?? null
  );
}
