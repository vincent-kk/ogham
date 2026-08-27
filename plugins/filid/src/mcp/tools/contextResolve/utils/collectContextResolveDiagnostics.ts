import type { ContextResolveResult } from '../../../../types/report.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';

/**
 * Collect the first occurrence of each diagnostic across ordered results.
 * @param results Per-request outcomes in input order.
 * @returns Deduplicated diagnostics in first-seen order.
 */
export function collectContextResolveDiagnostics(
  results: ContextResolveResult[],
): ToolDiagnostic[] {
  const seen = new Set<string>();
  return results.flatMap((result) =>
    result.diagnostics.filter((diagnostic) => {
      const identity = JSON.stringify([
        diagnostic.code,
        diagnostic.message,
        diagnostic.path ?? null,
      ]);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    }),
  );
}
