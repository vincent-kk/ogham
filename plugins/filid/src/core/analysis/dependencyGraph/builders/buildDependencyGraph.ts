import type { DependencyReference } from '../../../../types/adapters.js';
import type {
  AnalysisCertainty,
  DependencyEvidence,
  DependencyGraph,
  DependencyGraphEdge,
} from '../../../../types/fractal.js';
import { detectCycles } from '../cycles/detectCycles.js';

import { canonicalizeNodePaths } from './canonicalizeNodePaths.js';
import { resolveOwnerPath } from './resolveOwnerPath.js';
import { resolveOwningOrganPath } from './resolveOwningOrganPath.js';

interface DependencyGraphOptions {
  /** Classified organ paths; enables owned-organ cycle exclusion when supplied. */
  organPaths?: readonly string[];
  /**
   * Adapter-reported verification file paths. Their references stay in the
   * evidence — placement still needs to see them — but leave the cycle
   * adjacency: verification reads a module to check it, which is not a runtime
   * dependency, and one test reading several modules would otherwise close a
   * loop that never runs.
   */
  verificationPaths?: readonly string[];
}

/**
 * Is this a reference to an organ the target owner owns, made from inside that
 * owner's own subtree?
 *
 * Such a reference is internal to the owner, not a dependency pointing at it.
 * Counting it as an edge makes the normal FCA shape — a parent barrel
 * re-exporting a child that reads a parent-owned organ — look like a cycle.
 */
function isOwnedOrganReference(
  organPaths: readonly string[],
  toFractalPath: string,
  evidence: DependencyEvidence,
): boolean {
  if (organPaths.length === 0) return false;
  if (resolveOwnerPath([toFractalPath], evidence.sourceFile) === null)
    return false;
  return (
    resolveOwningOrganPath(organPaths, toFractalPath, evidence.resolvedPath) !==
    null
  );
}

export function buildDependencyGraph(
  nodePaths: readonly string[],
  references: readonly DependencyReference[],
  certainty: AnalysisCertainty = 'exact',
  options: DependencyGraphOptions = {},
): DependencyGraph {
  const sortedNodePaths = canonicalizeNodePaths(nodePaths);
  const organPaths = options.organPaths ?? [];
  const verificationPaths = new Set(options.verificationPaths ?? []);
  const grouped = new Map<string, DependencyGraphEdge>();
  const cycleEdgeKeys = new Set<string>();
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
    if (
      !isOwnedOrganReference(organPaths, toFractalPath, evidence) &&
      !verificationPaths.has(evidence.sourceFile)
    )
      cycleEdgeKeys.add(key);
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
  graph.cycles = detectCycles({
    ...graph,
    edges: edges.filter((edge) =>
      cycleEdgeKeys.has(`${edge.fromFractalPath}\0${edge.toFractalPath}`),
    ),
  });
  return graph;
}
