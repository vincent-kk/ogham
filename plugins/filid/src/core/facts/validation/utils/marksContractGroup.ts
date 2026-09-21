/** The text a contract marker begins with, wherever it sits in the file. */
const MARKER = 'filid:contract';

/**
 * Whether one line carries a contract marker naming this group.
 *
 * Matched as text rather than by a built regular expression: an id is
 * submitted, and building a pattern out of submitted text is how a record
 * reaches the matcher itself.
 *
 * @param line - One line of the file.
 * @param id - The contract group id the record reports.
 * @returns True when the line has `filid:contract` followed by exactly this id.
 */
export function marksContractGroup(line: string, id: string): boolean {
  let from = line.indexOf(MARKER);
  while (from !== -1) {
    const after = line.slice(from + MARKER.length);
    const spaced = after.length - after.trimStart().length;
    const rest = after.slice(spaced);
    if (spaced > 0 && rest.startsWith(id) && !isIdCharacter(rest[id.length]))
      return true;
    from = line.indexOf(MARKER, from + MARKER.length);
  }
  return false;
}

/**
 * Whether a character could continue a contract group id.
 * @param character - The character after the reported id, or undefined at the
 * end of the line.
 * @returns True when the id would in fact be a prefix of a longer one.
 */
function isIdCharacter(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z0-9._-]/.test(character);
}
