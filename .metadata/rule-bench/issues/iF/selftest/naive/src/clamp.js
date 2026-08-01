/**
 * Clamps a value into an inclusive range.
 * @param {number} value - number to clamp.
 * @param {number} min - lower bound.
 * @param {number} max - upper bound.
 * @returns {number} value limited to [min, max]
 */
export function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
