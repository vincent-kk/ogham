import { CredentialsSchema, type Credentials } from "../../../types/index.js";
import { CREDENTIALS_PATH } from "../../../constants/index.js";
import { writeJson } from "../../../lib/fileIo.js";

/**
 * Validate credentials before persisting them with owner-only permissions.
 * @param credentials Values accepted by CredentialsSchema; valid input is written as supplied.
 * @param path Storage location; defaults to the host-resolved credential path.
 * @returns Resolves after persistence; schema failure writes nothing and throws, and I/O failures propagate.
 */
export async function saveCredentials(
  credentials: Credentials,
  path: string = CREDENTIALS_PATH,
): Promise<void> {
  CredentialsSchema.parse(credentials);
  await writeJson(path, credentials, { mode: 0o600 });
}
