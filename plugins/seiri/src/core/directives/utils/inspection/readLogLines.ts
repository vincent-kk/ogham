import { readSetFile } from './readSetFile.js';

/** Nonblank lines of a log file, or the error code of a refused read. */
interface LogLines {
  /** Each nonblank line with its 1-based number; empty when the file is absent or unreadable. */
  lines: { number: number; text: string }[];
  /** Error code of a refused read; undefined when the read was allowed. */
  error?: string;
}

/**
 * Read the nonblank lines of a log file in a set.
 * @param directory Validated set directory.
 * @param name Log file name inside the set.
 * @returns The lines, none when the file is absent, or the error code with no lines when access is denied.
 * @throws For read failures other than a missing file or denied access.
 */
export function readLogLines(directory: string, name: string): LogLines {
  const { body, error } = readSetFile(directory, name);
  return {
    lines: (body ?? '')
      .split(/\r?\n/)
      .map((text, index) => ({ number: index + 1, text }))
      .filter(({ text }) => text.trim() !== ''),
    ...(error === undefined ? {} : { error }),
  };
}
