import type { ProjectSnapshot } from '../../../../types/fractal.js';
import type { FractalScanPathsData } from '../../../../types/report.js';

export function buildFractalScanPathsData(
  snapshot: ProjectSnapshot,
): FractalScanPathsData {
  return {
    nodes: [...snapshot.tree.nodes.values()].map((node) => ({
      path: node.path,
      type: node.type,
      hasIntentMd: node.hasIntentMd,
      hasDetailMd: node.hasDetailMd,
      entryPointCount: node.entryPoints.length,
    })),
  };
}
