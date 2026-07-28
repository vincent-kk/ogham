import { portableIsAbsolute } from '@ogham/cross-platform/compat/is-absolute';
import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';
import { portableRelative } from '@ogham/cross-platform/paths/relative';

export function isPathWithin(rootPath: string, targetPath: string): boolean {
  const remainder = portableRelative(rootPath, targetPath);
  const comparable = pathForCompare(remainder);
  return (
    remainder === '' ||
    (comparable !== '..' &&
      !comparable.startsWith('../') &&
      !portableIsAbsolute(remainder))
  );
}
