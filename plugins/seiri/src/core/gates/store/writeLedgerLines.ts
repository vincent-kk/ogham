import { writeAtomically } from '../../utils/writeAtomically.js';

/**
 * Persist exact ledger lines through an atomic replacement.
 *
 * @param path Absolute gates ledger path.
 * @param lines Rewritten lines preserving the parser's terminal empty member.
 * @returns Nothing.
 */
export function writeLedgerLines(path: string, lines: string[]): void {
  const content = lines.join('\n') + (lines.at(-1) === '' ? '' : '\n');
  writeAtomically(path, content);
}
