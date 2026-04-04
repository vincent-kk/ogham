import * as path from 'node:path';

export function isAncestorPath(
  filePath: string,
  importPath: string,
  cwd: string,
): boolean {
  if (!importPath.startsWith('.')) return false;
  const fileDir = path.dirname(path.resolve(cwd, filePath));
  const resolvedImport = path.resolve(fileDir, importPath);
  const fileAbsolute = path.resolve(cwd, filePath);
  return fileAbsolute.startsWith(resolvedImport + path.sep);
}
