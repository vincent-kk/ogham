import type { ProjectSnapshot } from '../../../../../types/fractal.js';
import type { FractalScanPathsData } from '../../../../../types/report.js';

import { collectExportedNames } from './collectExportedNames.js';
import { filterNodesByName } from './filterNodesByName.js';

/**
 * Project snapshot nodes into the flat path DTO, optionally narrowed by name.
 *
 * Export names ride along only on a narrowed projection: they add roughly a
 * quarter to each node, which would push a whole-tree scan past the inline
 * budget — and a query that wants names is a narrow query to begin with.
 * @param snapshot Snapshot whose tree is projected.
 * @param nameFilter Directory name to match exactly; undefined keeps every node
 * and leaves export names out.
 * @returns Path entries carrying classification, document and entry-point evidence.
 */
export function buildFractalScanPathsData(
  snapshot: ProjectSnapshot,
  nameFilter?: string,
): FractalScanPathsData {
  const nodes = filterNodesByName(
    [...snapshot.tree.nodes.values()],
    nameFilter,
  );
  const includeExportedNames = nameFilter !== undefined;
  return {
    nodes: nodes.map((node) => {
      const exportedNames = includeExportedNames
        ? collectExportedNames(node)
        : undefined;
      return {
        path: node.path,
        type: node.type,
        hasIntentMd: node.hasIntentMd,
        hasDetailMd: node.hasDetailMd,
        entryPointCount: node.entryPoints.length,
        ...(exportedNames === undefined ? {} : { exportedNames }),
      };
    }),
  };
}
