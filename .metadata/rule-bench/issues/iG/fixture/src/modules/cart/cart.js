/**
 * Adds an item to a cart without mutating the original.
 * @param {{price: number, qty?: number}[]} cart - current cart.
 * @param {{price: number, qty?: number}} item - item to add.
 * @returns {{price: number, qty?: number}[]} new cart
 */
export function addItem(cart, item) {
  return [...cart, item];
}
