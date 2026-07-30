import { portableBasename } from '@ogham/cross-platform';

const DOT_SEGMENT = /^\.+$/;

/**
 * Drop one trailing extension from a path's final segment. A leading dot marks
 * a hidden name rather than an extension, so `.gitignore` is returned unchanged;
 * a segment of nothing but dots is a relative marker, so `..` is not `.` with an
 * extension; and directory separators are never touched.
 */
export function stripPathExtension(path: string): string {
  const segment = portableBasename(path);
  if (DOT_SEGMENT.test(segment)) return path;
  const dot = segment.lastIndexOf('.');
  if (dot <= 0) return path;
  return path.slice(0, path.length - (segment.length - dot));
}
