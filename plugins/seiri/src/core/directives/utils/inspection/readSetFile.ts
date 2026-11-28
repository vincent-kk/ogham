import { portableJoin, readUtf8FileIfExistsSync } from '@ogham/cross-platform';

/** Outcome of reading one file of a set. */
export interface SetFileRead {
  /** File text, or null when the file is absent or could not be read. */
  body: string | null;
  /** Error code of a refused read, such as EACCES; undefined when the read was allowed. */
  error?: string;
}

/**
 * Read a set file, treating a permission refusal as a result instead of a failure.
 * @param directory Validated set directory.
 * @param name File name relative to the set.
 * @returns The text, a null body for an absent file, or a null body with the error code when access is denied.
 * @throws For read failures other than a missing file or denied access.
 */
export function readSetFile(directory: string, name: string): SetFileRead {
  try {
    return {
      body: readUtf8FileIfExistsSync(portableJoin(directory, `./${name}`)),
    };
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : '';
    if (code === 'EACCES' || code === 'EPERM')
      return { body: null, error: code };
    throw error;
  }
}
