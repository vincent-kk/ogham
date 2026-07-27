import {
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
  samePath,
} from '@ogham/cross-platform/paths';

import type {
  FractalNode,
  ProjectSnapshot,
} from '../../../../types/fractal.js';
import type { RuleViolation } from '../../../../types/rules.js';

const RULE_ID = 'external-import-boundary';

function isPathWithin(parentPath: string, childPath: string): boolean {
  if (samePath(parentPath, childPath)) return true;
  const relative = portableRelative(parentPath, childPath);
  const comparable = pathForCompare(relative);
  return (
    comparable !== '..' &&
    !comparable.startsWith('../') &&
    !portableIsAbsolute(relative)
  );
}

function hasEntryPoint(node: FractalNode, path: string): boolean {
  return node.entryPoints.some((entryPoint) => samePath(entryPoint.path, path));
}

/**
 * Enforces FCA imports from snapshot evidence.
 *
 * External owners use the target entry point directly. Internal implementation
 * files use concrete peers, while an entry point may expose its own internals.
 */
export function checkExternalImportBoundary(context: {
  snapshot: ProjectSnapshot;
}): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const { dependencyGraph } = context.snapshot;

  for (const edge of dependencyGraph.edges) {
    const sourceNode = [...context.snapshot.tree.nodes.values()].find((node) =>
      samePath(node.path, edge.fromFractalPath),
    );
    const targetNode = [...context.snapshot.tree.nodes.values()].find((node) =>
      samePath(node.path, edge.toFractalPath),
    );
    if (!sourceNode || !targetNode) continue;

    for (const evidence of edge.evidence) {
      const sameOwner = samePath(sourceNode.path, targetNode.path);
      const sourceIsEntryPoint = hasEntryPoint(sourceNode, evidence.sourceFile);
      const targetIsEntryPoint = hasEntryPoint(
        targetNode,
        evidence.resolvedPath,
      );
      const parentBarrelBypass =
        !sameOwner && isPathWithin(targetNode.path, sourceNode.path);
      const localBarrelImport =
        sameOwner && targetIsEntryPoint && !sourceIsEntryPoint;
      const externalInternalImport = !sameOwner && !targetIsEntryPoint;
      if (!parentBarrelBypass && !localBarrelImport && !externalInternalImport)
        continue;

      violations.push({
        ruleId: RULE_ID,
        severity: 'error',
        message: `Import "${evidence.rawSpecifier}" bypasses the target module boundary.`,
        path: evidence.sourceFile,
        suggestion:
          'Use the target module entry point externally and concrete files internally.',
      });
    }
  }

  if (dependencyGraph.certainty !== 'exact')
    violations.push({
      ruleId: RULE_ID,
      severity: 'warning',
      message: `Import-boundary analysis is ${dependencyGraph.certainty}; unresolved evidence may hide additional boundary crossings.`,
      path: context.snapshot.tree.root,
      suggestion:
        'Resolve incomplete dependency evidence before claiming boundary safety.',
      certainty: dependencyGraph.certainty,
    });

  return violations;
}
