import { readFileSync, statSync } from 'node:fs';

import { readStdinResult } from '../../../lib/stdin.js';

import type { ExtractorUsageError } from './parseExtractorArguments.js';

/** Largest list file the program reads; a larger one is refused unread. */
const LIST_FILE_BYTE_LIMIT = 16 * 1024 * 1024;
/** How long standard input may stay open before the list read gives up. */
const STDIN_TIMEOUT_MS = 30_000;

/** The whole text of a file list; never a part of one. */
export interface ListText {
  text: string;
}

/** Stream a list is read from when `--files-from` is `-`. */
type ListInput = NonNullable<Parameters<typeof readStdinResult>[1]>;

/**
 * Read the list from standard input, refusing one that does not end in time.
 * @param input Stream to read to its end.
 * @param timeoutMs Longest wait for the end of the stream.
 * @returns The whole text, or the refusal; text read before a timeout is dropped.
 */
async function readStandardInput(
  input: ListInput,
  timeoutMs: number,
): Promise<ListText | ExtractorUsageError> {
  const read = await readStdinResult(timeoutMs, input);
  if (read.complete) return { text: read.text };
  return {
    error: `standard input did not end within ${timeoutMs / 1000} s; nothing was written. Close the input after the last path.`,
  };
}

/**
 * Read the file list `--files-from` names, refusing what cannot be a complete list.
 *
 * A list file is judged by `stat` before it is opened: a FIFO or a device
 * would block or never end, and a file over 16 MiB is not read.
 * @param source A list file path, or `-` for standard input.
 * @param input Stream read when `source` is `-`; the entry passes the process's stdin.
 * @param timeoutMs Longest wait for the end of `input`; 30 s unless a test shortens it.
 * @returns The list text, or the reason the run is refused.
 */
export async function readListText(
  source: string,
  input: ListInput,
  timeoutMs = STDIN_TIMEOUT_MS,
): Promise<ListText | ExtractorUsageError> {
  if (source === '-') return readStandardInput(input, timeoutMs);
  try {
    const stats = statSync(source);
    if (!stats.isFile())
      return { error: `--files-from ${source} is not a regular file.` };
    if (stats.size > LIST_FILE_BYTE_LIMIT)
      return { error: `--files-from ${source} is larger than 16 MiB.` };
    return { text: readFileSync(source, 'utf8') };
  } catch {
    return { error: `--files-from ${source} cannot be read.` };
  }
}
