import type {
  AnalysisCertainty,
  ProjectSnapshot,
} from '../../../../../types/fractal.js';
import type {
  FractalScanSummary,
  ValidationReport,
} from '../../../../../types/report.js';

/**
 * Builds bounded whole-tree counts for a scan response.
 *
 * @param snapshot - Snapshot supplying identity, adapters, and tree counts.
 * @param validation - Structure report supplying the finding count.
 * @param certainty - Resolved certainty after diagnostics are considered.
 * @returns The bounded whole-tree scan summary.
 */
export function buildFractalScanSummary(
  snapshot: ProjectSnapshot,
  validation: ValidationReport,
  certainty: AnalysisCertainty,
): FractalScanSummary {
  const nodesByType: FractalScanSummary['nodesByType'] = {};
  for (const node of snapshot.tree.nodes.values())
    nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
  return {
    projectRoot: snapshot.projectRoot,
    snapshotHash: snapshot.snapshotHash,
    adapterIds: snapshot.adapterIds,
    totalNodes: snapshot.tree.totalNodes,
    depth: snapshot.tree.depth,
    nodesByType,
    violationCount: validation.result.violations.length,
    certainty,
  };
}
