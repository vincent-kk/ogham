/**
 * Read a file list: a JSON array of strings, or one path per line.
 * @param text List text from a file or stdin.
 * @returns Paths in list order, blank lines dropped.
 * @throws When the text starts as a JSON array but is not an array of strings.
 */
export function readFileList(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed.startsWith('['))
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  const parsed: unknown = JSON.parse(trimmed);
  if (
    !Array.isArray(parsed) ||
    !parsed.every((entry) => typeof entry === 'string')
  )
    throw new Error('The JSON file list must be an array of path strings.');
  return parsed;
}
