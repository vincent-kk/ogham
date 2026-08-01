import { lineTotal } from './pricing/lineTotal.js';
import { shippingCost } from './pricing/shippingCost.js';

/**
 * Builds a quote for a set of items.
 * @param {{price: number, qty?: number, kg?: number}[]} items - items to quote.
 * @returns {{subtotal: number, shipping: number, total: number}} quote summary in cents
 */
export function quote(items) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  const totalKg = items.reduce((sum, item) => sum + (item.kg ?? 0), 0);
  const shipping = shippingCost(totalKg);
  return { subtotal, shipping, total: subtotal + shipping };
}
