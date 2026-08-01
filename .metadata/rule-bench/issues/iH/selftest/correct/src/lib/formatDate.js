/**
 * Formats a date as YYYY-MM-DD (UTC).
 * @param {Date} date - date to format.
 * @returns {string} ISO day string
 */
export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
