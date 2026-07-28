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
import { resolveOwningOrganPath } from '../../../analysis/dependencyGraph/index.js';

import { isBoundaryExemptionGranted } from './isBoundaryExemptionGranted.js';

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
 *
 * An organ has no entry point, so "route through the entry point" cannot apply
 * to it — organ access is judged by where the consumer sits instead. Inside the
 * owner's subtree a direct import is the shape LCA placement produces and is
 * allowed; outside it needs an exemption declared in the owner's DETAIL.md.
 *
 * The edge has already promoted the organ to its owning fractal, so the organ
 * identity is recovered from `evidence.resolvedPath`.
 *
 * A consumer the adapter reports as a verification file is not judged at all.
 * Verification exists to check a unit, and checking an internal unit means
 * reaching it; the alternative is exporting internals for tests alone, which
 * puts symbols on the public surface whose only consumer is a test. Which files
 * are verification is adapter evidence — core knows no filename patterns.
 */
export function checkExternalImportBoundary(context: {
  snapshot: ProjectSnapshot;
}): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const { dependencyGraph } = context.snapshot;
  const verificationPaths = new Set(
    context.snapshot.verification.files.map((file) => file.path),
  );

  for (const edge of dependencyGraph.edges) {
    const sourceNode = [...context.snapshot.tree.nodes.values()].find((node) =>
      samePath(node.path, edge.fromFractalPath),
    );
    const targetNode = [...context.snapshot.tree.nodes.values()].find((node) =>
      samePath(node.path, edge.toFractalPath),
    );
    if (!sourceNode || !targetNode) continue;

    for (const evidence of edge.evidence) {
      if (verificationPaths.has(evidence.sourceFile)) continue;
      const organPath = resolveOwningOrganPath(
        targetNode.organPaths,
        targetNode.path,
        evidence.resolvedPath,
      );
      if (organPath !== null) {
        if (isPathWithin(targetNode.path, evidence.sourceFile)) continue;
        if (
          isBoundaryExemptionGranted(targetNode, organPath, evidence.sourceFile)
        )
          continue;
        violations.push({
          ruleId: RULE_ID,
          severity: 'error',
          message: `Import "${evidence.rawSpecifier}" reaches organ "${organPath}" from outside its owner "${targetNode.path}".`,
          path: evidence.sourceFile,
          suggestion:
            'Promote the organ to a fractal, move it to its consumers lowest common fractal, or declare the exemption with a reason under "## Boundary Exemptions" in the owner DETAIL.md.',
        });
        continue;
      }

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
      if (
        isBoundaryExemptionGranted(
          targetNode,
          evidence.resolvedPath,
          evidence.sourceFile,
        )
      )
        continue;

      violations.push({
        ruleId: RULE_ID,
        severity: 'error',
        message: `Import "${evidence.rawSpecifier}" bypasses the target module boundary.`,
        path: evidence.sourceFile,
        suggestion:
          'Use the target module entry point externally and concrete files internally, or declare the exemption with a reason under "## Boundary Exemptions" in the owner DETAIL.md.',
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
