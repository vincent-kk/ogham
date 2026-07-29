import type { ContextResolution } from '../../../../types/context.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import type { ScopedDiagnostics } from '../../utils/scopeDiagnosticsToPaths.js';
import { scopeDiagnosticsToPaths } from '../../utils/scopeDiagnosticsToPaths.js';

/**
 * Narrow snapshot diagnostics to the resolved owner chain: the owner's subtree,
 * plus each ancestor's own path and document files.
 * @param diagnostics Snapshot diagnostics collected for the whole project.
 * @param resolution Resolved owner chain the diagnostics are judged against.
 * @returns Kept diagnostics, plus how many were dropped as out of scope.
 */
export function scopeDiagnosticsToChain(
  diagnostics: ToolDiagnostic[],
  resolution: ContextResolution,
): ScopedDiagnostics {
  const chainAddresses = resolution.chain.flatMap((document) =>
    [document.fractalPath, document.intentPath, document.detailPath].filter(
      (path): path is string => Boolean(path),
    ),
  );
  return scopeDiagnosticsToPaths(
    diagnostics,
    [resolution.ownerFractalPath],
    chainAddresses,
  );
}
