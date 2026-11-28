import { DIRECTIVE_LOG_FILES } from '../../../../constants/directives.js';
import type { DirectiveViolation } from '../../../../types/directives.js';

import { readLogLines } from './readLogLines.js';

/**
 * Find log lines that do not parse as a JSON object.
 * @param directory Validated set directory.
 * @param names File names present in the set.
 * @returns One violation per bad line of the notepad and history, in file then line order; a log that cannot be read gives one unreadable violation instead.
 */
export function findInvalidLogLines(
  directory: string,
  names: string[],
): DirectiveViolation[] {
  return Object.values(DIRECTIVE_LOG_FILES)
    .filter((file) => names.includes(file))
    .sort()
    .flatMap((file): DirectiveViolation[] => {
      const { lines, error } = readLogLines(directory, file);
      if (error !== undefined)
        return [{ file, problem: 'unreadable' as const, detail: error }];
      return lines
        .filter(({ text }) => !isJsonObject(text))
        .map(({ number }) => ({
          file,
          problem: 'invalid_line' as const,
          detail: `line ${number}`,
        }));
    });
}

/** Whether text parses to a non-null, non-array JSON object. */
function isJsonObject(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}
