/**
 * Display form of a fractal-map visit key: the boundary prefix (through the
 * tab) is dropped, leaving the boundary-relative directory. Legacy keys
 * without a tab pass through unchanged.
 */
export function displayDir(key: string): string {
  const tab = key.indexOf('\t');
  return tab === -1 ? key : key.slice(tab + 1);
}
