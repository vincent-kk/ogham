/**
 * Trim, deduplicate, and discard empty metadata list values.
 * @param {unknown} values candidate string array
 * @returns {string[]} stable unique strings
 */
export function normalizeValues(values) {
  if (!Array.isArray(values)) throw new Error('Metadata lists must be arrays');
  if (values.some((value) => typeof value !== 'string')) {
    throw new Error('Metadata list values must be strings');
  }
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
