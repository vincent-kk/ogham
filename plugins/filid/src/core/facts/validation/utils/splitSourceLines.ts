/**
 * Split text into lines on every line break a source file may use.
 *
 * The file's contents and a reported string that spans lines are both split
 * here, so `\r\n`, `\r` and `\n` compare as the same break on either side.
 *
 * @param text - File contents, or a string a provider reported.
 * @returns The lines in order, without their line breaks; one entry for text with no break.
 */
export function splitSourceLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}
