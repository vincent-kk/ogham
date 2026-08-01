import { formatCents } from './format/formatCents.js';

/**
 * Renders a receipt total line.
 * @param {number} totalCents - integer total in cents.
 * @returns {string} e.g. "Total: $12.50"
 */
export function totalLine(totalCents) {
  return `Total: ${formatCents(totalCents)}`;
}
