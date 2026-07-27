import type { DependencyReference } from '../../../../types/adapters.js';
import type {
  AnalysisCertainty,
  DependencyEvidence,
  DependencyGraph,
  DependencyGraphEdge,
} from '../../../../types/fractal.js';
import { detectCycles } from '../detectCycles.js';

import { canonicalizeNodePaths } from './canonicalizeNodePaths.js';
import { resolveOwnerPath } from './resolveOwnerPath.js';

export function buildDependencyGraph(
  nodePaths: readonly string[],
  references: readonly DependencyReference[],
  certainty: AnalysisCertainty = 'exact',
): DependencyGraph {
  const sortedNodePaths = canonicalizeNodePaths(nodePaths);
  const grouped = new Map<string, DependencyGraphEdge>();
  let graphCertainty = certainty;

  for (const reference of references) {
    if (reference.resolvedPath === null) {
      if (graphCertainty === 'exact') graphCertainty = 'indeterminate';
      continue;
    }
    const fromFractalPath = resolveOwnerPath(
      sortedNodePaths,
      reference.sourceFile,
    );
    const toFractalPath = resolveOwnerPath(
      sortedNodePaths,
      reference.resolvedPath,
    );
    if (!fromFractalPath || !toFractalPath) {
      if (graphCertainty === 'exact') graphCertainty = 'indeterminate';
      continue;
    }

    const key = `${fromFractalPath}\0${toFractalPath}`;
    const edge = grouped.get(key) ?? {
      fromFractalPath,
      toFractalPath,
      evidence: [],
    };
    const evidence: DependencyEvidence = {
      sourceFile: reference.sourceFile,
      rawSpecifier: reference.rawSpecifier,
      resolvedPath: reference.resolvedPath,
    };
    edge.evidence.push(evidence);
    grouped.set(key, edge);
  }

  const edges = [...grouped.values()]
    .map((edge) => ({
      ...edge,
      evidence: edge.evidence.sort(
        (left, right) =>
          left.sourceFile.localeCompare(right.sourceFile) ||
          left.rawSpecifier.localeCompare(right.rawSpecifier) ||
          left.resolvedPath.localeCompare(right.resolvedPath),
      ),
    }))
    .sort(
      (left, right) =>
        left.fromFractalPath.localeCompare(right.fromFractalPath) ||
        left.toFractalPath.localeCompare(right.toFractalPath),
    );
  const graph: DependencyGraph = {
    nodePaths: sortedNodePaths,
    edges,
    cycles: [],
    certainty: graphCertainty,
  };
  graph.cycles = detectCycles(graph);
  return graph;
}
