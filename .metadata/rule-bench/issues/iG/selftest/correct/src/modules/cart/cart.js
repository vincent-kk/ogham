import { computeTotal } from '../billing/index.js';

/**
 * Adds an item to a cart without mutating the original.
 * @param {{price: number, qty?: number}[]} cart - current cart.
 * @param {{price: number, qty?: number}} item - item to add.
 * @returns {{price: number, qty?: number}[]} new cart
 */
export function addItem(cart, item) {
  return [...cart, item];
}

/**
 * Totals the cart at checkout.
 * @param {{price: number, qty?: number}[]} cart - cart items.
 * @returns {number} order total in cents
 */
export function checkout(cart) {
  return computeTotal(cart);
}
