export function requireNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} must be a non-negative finite number`);
  return value;
}
