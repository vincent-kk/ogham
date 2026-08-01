import { formatDate } from '../../lib/formatDate.js';

/**
 * Builds a plain-text report row.
 * @param {string} title - report title.
 * @returns {string} report row
 */
export function reportRow(title) {
  return `[report] ${title}`;
}

/**
 * Builds a dated report line.
 * @param {string} title - report title.
 * @param {Date} date - report date.
 * @returns {string} dated report line
 */
export function reportLine(title, date) {
  return `${formatDate(date)} — ${title}`;
}
