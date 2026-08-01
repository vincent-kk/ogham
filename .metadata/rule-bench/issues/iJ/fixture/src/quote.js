import { config } from './config.js';
import { lineTotal } from './pricing/lineTotal.js';

/**
 * Builds a quote for a set of items.
 * @param {{price: number, qty?: number, kg?: number}[]} items - items to quote.
 * @returns {{subtotal: number}} quote summary in cents
 */
export function quote(items) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  return { subtotal };
}
