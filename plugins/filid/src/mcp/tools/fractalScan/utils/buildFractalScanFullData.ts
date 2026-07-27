import type { ProjectSnapshot } from '../../../../types/fractal.js';
import type {
  FractalScanFullData,
  ProjectSnapshotDto,
  ValidationReport,
} from '../../../../types/report.js';

export function buildFractalScanFullData(
  snapshot: ProjectSnapshot,
  validation: ValidationReport,
): FractalScanFullData {
  const { tree, ...snapshotFields } = snapshot;
  const snapshotDto: ProjectSnapshotDto = {
    ...snapshotFields,
    tree: {
      root: tree.root,
      depth: tree.depth,
      totalNodes: tree.totalNodes,
      nodes: [...tree.nodes.values()],
    },
  };
  return { snapshot: snapshotDto, validation };
}
