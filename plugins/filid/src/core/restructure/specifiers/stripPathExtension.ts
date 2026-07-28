import { portableBasename } from '@ogham/cross-platform/paths';

/**
 * Drop one trailing extension from a path's final segment. A leading dot marks
 * a hidden name rather than an extension, so `.gitignore` is returned unchanged,
 * and directory separators are never touched.
 */
export function stripPathExtension(path: string): string {
  const segment = portableBasename(path);
  const dot = segment.lastIndexOf('.');
  if (dot <= 0) return path;
  return path.slice(0, path.length - (segment.length - dot));
}
