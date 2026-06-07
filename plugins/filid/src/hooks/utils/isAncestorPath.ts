import * as path from 'node:path';

import { pathForCompare } from '@ogham/cross-platform/compat';

export function isAncestorPath(
  filePath: string,
  importPath: string,
  cwd: string,
): boolean {
  if (!importPath.startsWith('.')) return false;
  const fileDir = path.dirname(path.resolve(cwd, filePath));
  const resolvedImport = path.resolve(fileDir, importPath);
  const fileAbsolute = path.resolve(cwd, filePath);
  return pathForCompare(fileAbsolute).startsWith(
    pathForCompare(resolvedImport) + '/',
  );
}
