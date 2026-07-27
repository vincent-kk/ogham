import { portableIsAbsolute } from '@ogham/cross-platform/compat/is-absolute';
import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';
import {
  normalize,
  portableRelative,
  portableResolve,
} from '@ogham/cross-platform/paths';

export interface HashFile {
  absolutePath: string;
  relativePath: string;
}

export function resolveHashFile(
  projectRoot: string,
  filePath: string,
): HashFile {
  const absoluteRoot = portableResolve(projectRoot);
  const absolutePath = portableResolve(absoluteRoot, filePath);
  const relativePath = portableRelative(absoluteRoot, absolutePath);
  const comparable = pathForCompare(relativePath);
  if (
    portableIsAbsolute(relativePath) ||
    comparable === '..' ||
    comparable.startsWith('../')
  )
    throw new Error(`Snapshot hash path is outside project root: ${filePath}`);
  return {
    absolutePath,
    relativePath: normalize(relativePath),
  };
}
