import { writeFileAtomicallySync } from '@ogham/cross-platform';

/** The list filid wrote, and what it could not put in it. */
export interface ExtractionListWrite {
  /** How many paths the file holds, one per line. */
  count: number;
  /**
   * Paths left out because a line-oriented file cannot carry them.
   *
   * A newline in a name would read as two entries and a NUL truncates the name
   * for most readers, so such a file is reported as a count rather than silently
   * split into paths that name nothing.
   */
  unrepresentable: number;
}

/** A name a line-oriented list cannot carry without changing what it means. */
const UNREPRESENTABLE = /[\n\r\0]/;

/**
 * Write the list of files an extractor should read, one path per line.
 *
 * The server decides the scope rather than the extractor: the extractor is a
 * program the agent runs in its own sandbox, and asking it to re-derive which
 * files are in scope would duplicate the scan, the ignore rules and the facts
 * scope in a second implementation that can drift. It reads this file with
 * `--files-from` and needs no project knowledge at all.
 *
 * The cache directory is the right home for it: the agent's sandbox can read
 * there but not write, which is exactly the direction this file travels
 * (measured, see `evidence/s3a-measurements.md`). The contents are project
 * paths — nothing secret — and the write is an atomic replace, so a reader
 * either sees the previous list or this one.
 *
 * @param path - Absolute path of the list file.
 * @param relativePaths - Project-relative POSIX paths to extract, in order.
 * @returns How many paths were written and how many could not be.
 */
export function writeExtractionList(
  path: string,
  relativePaths: readonly string[],
): ExtractionListWrite {
  const writable = relativePaths.filter(
    (candidate) => !UNREPRESENTABLE.test(candidate),
  );
  writeFileAtomicallySync(
    path,
    writable.length === 0 ? '' : `${writable.join('\n')}\n`,
  );
  return {
    count: writable.length,
    unrepresentable: relativePaths.length - writable.length,
  };
}
