import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
} from 'node:fs';
import { parse } from 'node:path';

import { assertNoSymlinkDescendantsSync } from '@ogham/cross-platform';

/** Why a guarded read refused, or the bytes it produced. */
export type GuardedFileRead =
  | { ok: true; bytes: Buffer }
  | { ok: false; reason: 'symlink' | 'not-regular' | 'too-large' | 'unreadable' };

/**
 * Read a file filid was pointed at by a caller, refusing anything but a plain
 * regular file within a byte cap.
 *
 * The MCP server runs outside the agent's sandbox and serves every tool and
 * every project from one synchronous process, so a path that blocks on open
 * stops the whole server. `O_NONBLOCK` is what prevents that: opening a FIFO
 * without it waits forever for a writer, and a character device can block too.
 * With it, both open immediately and fail the `isFile` check instead.
 *
 * Three further checks close the paths that matter, in this order: no ancestor
 * component may be a symbolic link, the final component is opened with
 * `O_NOFOLLOW` so it cannot be swapped for a link between the walk and the
 * open, and the file type and size are taken from `fstat` on the open
 * descriptor rather than from a second path lookup. Exactly `size` bytes are
 * read, so a file that grows after the stat cannot exceed the cap.
 *
 * Callers pass a canonical path, which makes the ancestor walk pass by
 * construction; it stays because canonicalization is a separate step that can
 * be skipped or fail, and `O_NOFOLLOW` alone covers only the last component.
 *
 * Neither flag exists in `fs.constants` on Windows, where each resolves to 0 and
 * drops out of the bitwise OR. `O_NONBLOCK`'s absence is harmless — the blocking
 * open it prevents is a POSIX FIFO — but `O_NOFOLLOW`'s is not, so where the
 * flag is unavailable the final component is `lstat`ed first and refused if it
 * is a link. That check is not atomic, which is exactly why it is the fallback
 * rather than the rule; the `fstat` on the open descriptor still decides type
 * and size, so a swap between the two can only produce a refusal, never a read
 * of something that is not a regular file.
 *
 * @param absolutePath - Absolute path to read; the caller checks containment.
 * @param maxBytes - Largest file size accepted, inclusive.
 * @returns The bytes, or the reason the read was refused. No filesystem error
 * text and no file content ever leaves through this result.
 */
export function readGuardedFileSync(
  absolutePath: string,
  maxBytes: number,
): GuardedFileRead {
  try {
    assertNoSymlinkDescendantsSync(parse(absolutePath).root, absolutePath);
  } catch {
    return { ok: false, reason: 'symlink' };
  }
  const noFollow = constants.O_NOFOLLOW ?? 0;
  let descriptor: number | null = null;
  try {
    if (noFollow === 0 && lstatSync(absolutePath).isSymbolicLink())
      return { ok: false, reason: 'symlink' };
    descriptor = openSync(
      absolutePath,
      constants.O_RDONLY | noFollow | (constants.O_NONBLOCK ?? 0),
    );
    const stats = fstatSync(descriptor);
    if (!stats.isFile()) return { ok: false, reason: 'not-regular' };
    if (stats.size > maxBytes) return { ok: false, reason: 'too-large' };
    const bytes = Buffer.alloc(stats.size);
    readSync(descriptor, bytes, 0, stats.size, 0);
    return { ok: true, bytes };
  } catch {
    return { ok: false, reason: 'unreadable' };
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}
