import { config } from '../config.js';

/**
 * Computes shipping for a total weight.
 * @param {number} totalKg - total shipment weight in kilograms.
 * @returns {number} shipping cost in cents
 */
export function shippingCost(totalKg) {
  return config.baseRate + totalKg * config.perKg;
}
