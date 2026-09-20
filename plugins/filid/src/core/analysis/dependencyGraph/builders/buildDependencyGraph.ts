import { DEPENDENCY_DIAGNOSTIC_CODES } from '../../../../constants/dependencyDiagnosticCodes.js';
import type { DependencyReference } from '../../../../types/adapters.js';
import type {
  AnalysisCertainty,
  DependencyEvidence,
  DependencyGraph,
  DependencyGraphEdge,
  UnknownFile,
} from '../../../../types/fractal.js';
import { detectCycles } from '../cycles/detectCycles.js';

import { canonicalizeNodePaths } from './canonicalizeNodePaths.js';
import { listUnknownFiles } from './listUnknownFiles.js';
import { resolveOwnerPath } from './resolveOwnerPath.js';
import { resolveOwningOrganPath } from './resolveOwningOrganPath.js';
import { sortPathsDeepestFirst } from './sortPathsDeepestFirst.js';

interface DependencyGraphOptions {
  /** Root the `unknownFiles` paths are relative to. */
  projectRoot: string;
  /** Entries the collector attributed outside the references: read failures, ownership conflicts, unfollowed links. */
  unknownFiles?: readonly UnknownFile[];
  /** Classified organ paths; enables owned-organ cycle exclusion when supplied. */
  organPaths?: readonly string[];
  /**
   * Adapter-reported verification file paths. Their references stay in the
   * evidence — placement still needs to see them — but leave the cycle
   * adjacency and reference-level certainty: verification reads a module to
   * check it, which is not a runtime dependency, and one test reading several
   * modules would otherwise close a loop that never runs.
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
 * @param references Dependency references; an unresolved production reference,
 * or any reference marked `indeterminate` (verification files included), puts
 * its source in `unknownFiles` rather than silently dropping out or becoming an
 * edge. An owner-less reference becomes neither: it is reported separately by
 * `findUnownedReferences`, with its source and its owner-less target.
 * @param certainty Starting certainty from the reference collector: `unsupported`
 * stays; `indeterminate` stays even with an empty list, so uncertainty the
 * caller could not attribute is not lost.
 * @param options Project root, collector-attributed files, and the organ and
 * verification paths excluded from cycle adjacency.
 * @returns Sorted edges with evidence, representative cycle routes, the
 * unknown files and the certainty derived from them.
 */
export function buildDependencyGraph(
  nodePaths: readonly string[],
  references: readonly DependencyReference[],
  certainty: AnalysisCertainty,
  options: DependencyGraphOptions,
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
  const causesBySource = new Map<string, Set<string>>();
  const attribute = (sourceFile: string, cause: string): void => {
    const causes = causesBySource.get(sourceFile) ?? new Set<string>();
    causes.add(cause);
    causesBySource.set(sourceFile, causes);
  };

  const resolveOwnerCached = (targetPath: string): string | null => {
    const cached = ownerByPath.get(targetPath);
    if (cached !== undefined) return cached;
    const owner = resolveOwnerPath(nodePathsDeepestFirst, targetPath);
    ownerByPath.set(targetPath, owner);
    return owner;
  };

  for (const reference of references) {
    const isVerification = verificationPaths.has(reference.sourceFile);
    if (reference.certainty === 'indeterminate') {
      attribute(reference.sourceFile, DEPENDENCY_DIAGNOSTIC_CODES.UNCERTAIN);
      if (reference.resolvedPath === null && !isVerification)
        attribute(reference.sourceFile, DEPENDENCY_DIAGNOSTIC_CODES.UNRESOLVED);
      continue;
    }
    if (reference.resolvedPath === null) {
      if (!isVerification)
        attribute(reference.sourceFile, DEPENDENCY_DIAGNOSTIC_CODES.UNRESOLVED);
      continue;
    }
    const fromFractalPath = resolveOwnerCached(reference.sourceFile);
    const toFractalPath = resolveOwnerCached(reference.resolvedPath);
    // An owner-less end has no node, and an edge between nodes that do not
    // exist cannot make a cycle. The reference is reported as a finding with
    // its source and target instead; making a boundary is the user's call, so
    // this cannot be the graph's reason to stop.
    if (!fromFractalPath || !toFractalPath) continue;

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
      !isVerification
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
  const unknownFiles = listUnknownFiles(
    options.projectRoot,
    causesBySource,
    options.unknownFiles ?? [],
  );
  const graph: DependencyGraph = {
    nodePaths: sortedNodePaths,
    edges,
    cycles: [],
    unknownFiles,
    certainty:
      certainty === 'unsupported'
        ? 'unsupported'
        : unknownFiles.length > 0 || certainty === 'indeterminate'
          ? 'indeterminate'
          : 'exact',
  };
  graph.cycles = detectCycles({
    ...graph,
    edges: edges.filter((edge) =>
      cycleEdgeKeys.has(`${edge.fromFractalPath}\0${edge.toFractalPath}`),
    ),
  });
  return graph;
}
