/**
 * Computes shipping cost from explicit rates.
 * @param {number} totalKg - total shipment weight in kilograms.
 * @param {number} baseRate - flat base charge in cents.
 * @param {number} perKg - per-kilogram charge in cents.
 * @returns {number} shipping cost in cents
 */
export function shippingCost(totalKg, baseRate, perKg) {
  return baseRate + totalKg * perKg;
}
