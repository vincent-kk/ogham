import type { FractalTree } from '../../../types/fractal.js';

export function snapshotStructureInput(tree: FractalTree): unknown[] {
  return [...tree.nodes.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
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
