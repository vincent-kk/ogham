import { normalizeSnapshotHashString } from './normalizeSnapshotHashString.js';

export function normalizeSnapshotHashInput(
  projectRoot: string,
  input: unknown,
): unknown {
  if (typeof input === 'string')
    return normalizeSnapshotHashString(projectRoot, input);
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input))
    return input.map((item) => normalizeSnapshotHashInput(projectRoot, item));
  if (input instanceof Map)
    return new Map(
      [...input].map(([key, value]) => [
        normalizeSnapshotHashInput(projectRoot, key),
        normalizeSnapshotHashInput(projectRoot, value),
      ]),
    );
  if (input instanceof Set)
    return new Set(
      [...input].map((item) => normalizeSnapshotHashInput(projectRoot, item)),
    );
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return input;
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      normalizeSnapshotHashString(projectRoot, key),
      normalizeSnapshotHashInput(projectRoot, value),
    ]),
  );
}
