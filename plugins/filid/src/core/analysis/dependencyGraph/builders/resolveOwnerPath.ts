import { portableIsAbsolute } from '@ogham/cross-platform/compat/is-absolute';
import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';
import { portableRelative } from '@ogham/cross-platform/paths/relative';

export function resolveOwnerPath(
  nodePaths: readonly string[],
  targetPath: string,
): string | null {
  return (
    [...nodePaths]
      .sort((left, right) => right.length - left.length)
      .find((candidate) => {
        const remainder = portableRelative(candidate, targetPath);
        const comparable = pathForCompare(remainder);
        return (
          remainder === '' ||
          (comparable !== '..' &&
            !comparable.startsWith('../') &&
            !portableIsAbsolute(remainder))
        );
      }) ?? null
  );
}
