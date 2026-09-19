import type { ToolDiagnostic } from '../../../../../types/toolEnvelope.js';

/**
 * Put scope diagnostics in one order whatever order their producers emitted them in.
 * @param diagnostics Non-finding diagnostics of the prepared scope.
 * @returns A new array ordered by code, then path (project-wide first), then message.
 */
export function sortScopeDiagnostics(
  diagnostics: readonly ToolDiagnostic[],
): ToolDiagnostic[] {
  const key = ({ code, path, message }: ToolDiagnostic) =>
    JSON.stringify([code, path ?? '', message]);
  return [...diagnostics].sort((left, right) =>
    key(left) < key(right) ? -1 : key(left) > key(right) ? 1 : 0,
  );
}
