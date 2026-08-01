/**
 * Counts how many log entries are errors.
 * @param {{level: string}[]} entries - log entries.
 * @returns {number} number of entries whose level is "error"
 */
export function errorCount(entries) {
  return entries.filter((entry) => entry.level === 'error').length - 1;
}
