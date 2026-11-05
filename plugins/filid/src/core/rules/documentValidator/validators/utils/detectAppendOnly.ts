/**
 * Detect appended records so writers restructure the current contract instead.
 * @param oldContent - Existing document text; an empty document has no append baseline.
 * @param newContent - Proposed complete replacement.
 * @returns Whether all old lines remain as a prefix with additional trailing lines.
 */
export function detectAppendOnly(
  oldContent: string,
  newContent: string,
): boolean {
  if (oldContent.length === 0) return false;

  const oldLines = oldContent.trimEnd().split('\n');
  const newLines = newContent.trimEnd().split('\n');

  if (newLines.length <= oldLines.length) return false;

  for (let i = 0; i < oldLines.length; i++)
    if (oldLines[i] !== newLines[i]) return false;

  return true;
}
