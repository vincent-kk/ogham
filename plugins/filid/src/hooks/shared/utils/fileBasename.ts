/**
 * Extract the filename from a path, handling both / and \ separators.
 */
export function fileBasename(filePath: string): string {
  const lastSlash = Math.max(
    filePath.lastIndexOf('/'),
    filePath.lastIndexOf('\\'),
  );
  return lastSlash === -1 ? filePath : filePath.slice(lastSlash + 1);
}
