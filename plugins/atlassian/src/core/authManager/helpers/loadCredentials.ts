import { stat, chmod } from "node:fs/promises";
import { ZodError } from "zod";
import { CredentialsSchema, type Credentials } from "../../../types/index.js";
import { CREDENTIALS_PATH } from "../../../constants/index.js";
import { readJson } from "../../../lib/fileIo.js";
import { InvalidCredentialsError } from "./invalidCredentialsError.js";

/**
 * Load schema-validated credentials and tighten existing file permissions.
 * @param path Storage location; defaults to the host-resolved credential path.
 * @returns Valid credentials or an empty object for a missing file.
 * @throws InvalidCredentialsError for schema-invalid data; other read/parse failures propagate.
 */
export async function loadCredentials(
  path: string = CREDENTIALS_PATH,
): Promise<Credentials> {
  try {
    const s = await stat(path);
    if ((s.mode & 0o077) !== 0) await chmod(path, 0o600);
  } catch {
    // The read below distinguishes a missing file from other storage errors.
  }
  try {
    return await readJson<Credentials>(path, CredentialsSchema, {});
  } catch (error) {
    if (error instanceof ZodError) throw new InvalidCredentialsError();
    throw error;
  }
}
