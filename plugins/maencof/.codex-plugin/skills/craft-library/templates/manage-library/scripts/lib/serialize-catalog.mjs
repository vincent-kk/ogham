/**
 * Serialize entries as a classic-script global usable from file URLs.
 * @param {Array<Record<string, unknown>>} entries validated catalog entries
 * @returns {string} deterministic JavaScript source
 */
export function serializeCatalog(entries) {
  return `var MAENCOF_LIBRARY_CATALOG = ${JSON.stringify(entries, null, 2)};\n`;
}
