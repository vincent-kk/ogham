import { getAt } from './get-at.js';

type PathSegment = string | number;

export function deleteAt(
  root: unknown,
  path: ReadonlyArray<PathSegment>,
): void {
  if (path.length === 0) return;
  const parent = getAt(root, path.slice(0, -1));
  const leaf = path[path.length - 1];
  if (parent === null || parent === undefined || leaf === undefined) return;
  if (Array.isArray(parent) && typeof leaf === 'number') {
    parent.splice(leaf, 1);
    return;
  }
  if (typeof parent === 'object' && typeof leaf === 'string') {
    delete (parent as Record<string, unknown>)[leaf];
  }
}
