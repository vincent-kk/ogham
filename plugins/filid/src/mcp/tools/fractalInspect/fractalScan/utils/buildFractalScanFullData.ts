import type { ProjectSnapshot } from '../../../../../types/fractal.js';
import type {
  FractalScanFullData,
  ProjectSnapshotDto,
  ValidationReport,
} from '../../../../../types/report.js';

/**
 * Converts the in-process snapshot Map into the flat full-scan DTO.
 *
 * @param snapshot - Snapshot whose tree nodes need transport serialization.
 * @param validation - Structure report produced from the same snapshot.
 * @returns Full scan data with a flat node array.
 */
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
