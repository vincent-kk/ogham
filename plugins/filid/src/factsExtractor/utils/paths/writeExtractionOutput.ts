import { randomUUID } from 'node:crypto';
import {
  closeSync,
  openSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';

/**
 * Write the extraction output so a reader never sees half a file.
 *
 * The shared `writeFileAtomicallySync` would do this, but importing the
 * `@ogham/cross-platform` root pulls its spawn helpers — and cross-spawn is
 * CommonJS, so the bundle cannot shake them out. This program starts no
 * process, and its bundle guard enforces that, so it writes the file itself.
 *
 * @param path Absolute output path, already checked to lie outside the project.
 * @param content Serialized records, written as UTF-8.
 * @returns Nothing once the file is in place.
 * @throws Whatever the write or the rename raises; the temporary file is removed first.
 */
export function writeExtractionOutput(path: string, content: string): void {
  const temporaryPath = `${path}.tmp-${randomUUID()}`;
  let descriptor: number | null = null;
  try {
    descriptor = openSync(temporaryPath, 'wx');
    writeFileSync(descriptor, content);
    closeSync(descriptor);
    descriptor = null;
    renameSync(temporaryPath, path);
  } catch (error) {
    if (descriptor !== null) closeSync(descriptor);
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}
