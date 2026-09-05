import {
  normalize,
  portableRelative,
  portableResolve,
} from '@ogham/cross-platform';

/**
 * Normalize an absolute or project-relative path to portable display form.
 * @param projectRoot Absolute project root that owns the path.
 * @param targetPath Absolute or project-relative path to normalize.
 * @returns POSIX-style project-relative path, or `.` for the root itself.
 */
export function toProjectRelativePath(
  projectRoot: string,
  targetPath: string,
): string {
  const absolutePath = portableResolve(projectRoot, targetPath);
  return normalize(portableRelative(projectRoot, absolutePath)) || '.';
}
