import {
  isWindowsLikePath,
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
} from '@ogham/cross-platform';

const PATH_TOKEN_CHARACTER = /[A-Za-z0-9_.-]/;

export function normalizeSnapshotHashString(
  projectRoot: string,
  value: string,
): string {
  if (portableIsAbsolute(value)) {
    const relativePath = portableRelative(projectRoot, value);
    const comparablePath = pathForCompare(relativePath);
    const contained =
      !portableIsAbsolute(relativePath) &&
      comparablePath !== '..' &&
      !comparablePath.startsWith('../');
    if (contained) return comparablePath || '.';
  }

  const comparableRoot = pathForCompare(projectRoot).replace(/\/+$/, '');
  if (comparableRoot.length < 2) return value;
  const comparableValue = isWindowsLikePath(projectRoot)
    ? pathForCompare(value).toLowerCase()
    : pathForCompare(value);
  const chunks: string[] = [];
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < comparableValue.length) {
    const index = comparableValue.indexOf(comparableRoot, searchFrom);
    if (index < 0) break;
    const before = comparableValue[index - 1];
    const after = comparableValue[index + comparableRoot.length];
    if (
      (before !== undefined && PATH_TOKEN_CHARACTER.test(before)) ||
      (after !== undefined && after !== '/' && PATH_TOKEN_CHARACTER.test(after))
    ) {
      searchFrom = index + comparableRoot.length;
      continue;
    }
    chunks.push(value.slice(cursor, index), '.');
    cursor = index + comparableRoot.length;
    searchFrom = cursor;
  }

  return chunks.length === 0
    ? value
    : `${chunks.join('')}${value.slice(cursor)}`;
}
