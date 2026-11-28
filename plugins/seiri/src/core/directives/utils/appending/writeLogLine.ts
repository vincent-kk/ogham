import { closeSync, fstatSync, readSync, writeSync } from 'node:fs';

import { openWithoutFollowing } from './utils/openWithoutFollowing.js';

/**
 * Append a line through one descriptor that was opened without following links.
 * @param path Log file path; created when absent.
 * @param line Complete line, newline included.
 * @returns False when the path is a link or not a regular file; true once the line is written.
 * @throws For failures other than a link at the path, such as permissions, and when the file accepts no more bytes before the line is complete.
 */
export function writeLogLine(path: string, line: string): boolean {
  const descriptor = openWithoutFollowing(path);
  if (descriptor === undefined) return false;
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile()) return false;
    const separator =
      stat.size > 0 && !endsWithNewline(descriptor, stat.size) ? '\n' : '';
    writeAll(descriptor, Buffer.from(`${separator}${line}`));
    return true;
  } finally {
    closeSync(descriptor);
  }
}

/** Whether the last byte of an open file is a line feed, read through the same descriptor. */
function endsWithNewline(descriptor: number, size: number): boolean {
  const last = Buffer.alloc(1);
  readSync(descriptor, last, 0, 1, size - 1);
  return last[0] === 0x0a;
}

/** Write every byte, because one write call may accept only part of the buffer. */
function writeAll(descriptor: number, bytes: Buffer): void {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const written = writeSync(descriptor, bytes, offset);
    if (written <= 0) throw new Error('log line could not be written in full');
    offset += written;
  }
}
