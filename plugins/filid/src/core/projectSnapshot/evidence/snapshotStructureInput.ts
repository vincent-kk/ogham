import type { FractalTree } from '../../../types/fractal.js';
import { compareByBytes } from '../../../lib/compareByBytes.js';

export function snapshotStructureInput(tree: FractalTree): unknown[] {
  return [...tree.nodes.values()]
    .sort((left, right) => compareByBytes(left.path, right.path))
    .map((node) => ({
      path: node.path,
      type: node.type,
      parentFractalPath: node.parentFractalPath,
      entryPoints: node.entryPoints,
      peerFiles: node.peerFiles,
      documentEvidence: node.documentEvidence,
      entryPointSurfaces: node.entryPointSurfaces,
    }));
}
