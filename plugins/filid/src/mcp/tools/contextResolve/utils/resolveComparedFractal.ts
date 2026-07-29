import { portableResolve } from '@ogham/cross-platform/compat/resolve';

import { findLowestCommonFractal } from '../../../../core/index.js';
import type { ProjectSnapshot } from '../../../../types/fractal.js';

/**
 * Resolve the lowest fractal owning every compared path — the placement
 * question "where does shared code between these consumers belong?".
 * @param snapshot Snapshot whose tree owns the paths.
 * @param comparePaths Paths to compare, absolute or project-relative.
 * @returns The common fractal path, or null when no single fractal owns them
 * all — an unowned path is reported as null rather than guessed at the root.
 */
export function resolveComparedFractal(
  snapshot: ProjectSnapshot,
  comparePaths: string[],
): string | null {
  const resolved = comparePaths.map((path) =>
    portableResolve(snapshot.projectRoot, path),
  );
  return findLowestCommonFractal(snapshot.tree, resolved)?.path ?? null;
}
