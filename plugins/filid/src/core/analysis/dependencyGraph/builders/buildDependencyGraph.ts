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
import { sortPathsDeepestFirst } from './sortPathsDeepestFirst.js';

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
 *
 * The organ lookup scans every candidate, so its result is memoised on the
 * owner and resolved path it depends on.
 */
function isOwnedOrganReference(
  organPathsDeepestFirst: readonly string[],
  toFractalPath: string,
  evidence: DependencyEvidence,
  organByOwnerAndFile: Map<string, string | null>,
): boolean {
  if (organPathsDeepestFirst.length === 0) return false;
  if (resolveOwnerPath([toFractalPath], evidence.sourceFile) === null)
    return false;
  const key = `${toFractalPath}\0${evidence.resolvedPath}`;
  const cached = organByOwnerAndFile.get(key);
  if (cached !== undefined) return cached !== null;
  const organPath = resolveOwningOrganPath(
    organPathsDeepestFirst,
    toFractalPath,
    evidence.resolvedPath,
  );
  organByOwnerAndFile.set(key, organPath);
  return organPath !== null;
}

/**
 * Aggregate adapter dependency references into owner-level edges and cycles.
 * @param nodePaths Non-organ owner paths that can appear as graph nodes.
 * @param references Adapter-reported references; an unresolved one makes the
 * graph indeterminate rather than silently dropping out.
 * @param certainty Starting certainty from the reference collector.
 * @param options Organ and verification paths excluded from cycle adjacency.
 * @returns Sorted edges with evidence, representative cycle routes and certainty.
 */
export function buildDependencyGraph(
  nodePaths: readonly string[],
  references: readonly DependencyReference[],
  certainty: AnalysisCertainty = 'exact',
  options: DependencyGraphOptions = {},
): DependencyGraph {
  const sortedNodePaths = canonicalizeNodePaths(nodePaths);
  // Sorted once per graph, not once per lookup: owner resolution runs for every
  // reference, and the candidate list does not change between them.
  const nodePathsDeepestFirst = sortPathsDeepestFirst(sortedNodePaths);
  const organPathsDeepestFirst = sortPathsDeepestFirst(
    options.organPaths ?? [],
  );
  const verificationPaths = new Set(options.verificationPaths ?? []);
  const grouped = new Map<string, DependencyGraphEdge>();
  const cycleEdgeKeys = new Set<string>();
  const ownerByPath = new Map<string, string | null>();
  const organByOwnerAndFile = new Map<string, string | null>();
  let graphCertainty = certainty;

  const resolveOwnerCached = (targetPath: string): string | null => {
    const cached = ownerByPath.get(targetPath);
    if (cached !== undefined) return cached;
    const owner = resolveOwnerPath(nodePathsDeepestFirst, targetPath);
    ownerByPath.set(targetPath, owner);
    return owner;
  };

  for (const reference of references) {
    if (reference.resolvedPath === null) {
      if (graphCertainty === 'exact') graphCertainty = 'indeterminate';
      continue;
    }
    const fromFractalPath = resolveOwnerCached(reference.sourceFile);
    const toFractalPath = resolveOwnerCached(reference.resolvedPath);
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
      !isOwnedOrganReference(
        organPathsDeepestFirst,
        toFractalPath,
        evidence,
        organByOwnerAndFile,
      ) &&
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
