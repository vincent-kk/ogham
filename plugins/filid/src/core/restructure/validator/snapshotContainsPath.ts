import {
  portableDirname,
  portableJoin,
  samePath,
} from '@ogham/cross-platform/paths';

import type { ProjectSnapshot } from '../../../types/fractal.js';

export function snapshotContainsPath(
  snapshot: ProjectSnapshot,
  targetPath: string,
): boolean {
  if (
    [...snapshot.tree.nodes.values()].some((node) =>
      samePath(node.path, targetPath),
    )
  )
    return true;
  const parentPath = portableDirname(targetPath);
  const parentNode = [...snapshot.tree.nodes.values()].find((node) =>
    samePath(node.path, parentPath),
  );
  return (
    parentNode?.peerFiles.some((peerFile) =>
      samePath(portableJoin(parentNode.path, peerFile), targetPath),
    ) ?? false
  );
}
