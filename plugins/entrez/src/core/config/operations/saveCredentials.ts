import type { EntrezCredentials } from "../../../types/config.js";
import { EntrezCredentialsSchema } from "../../../types/config.js";
import { CREDENTIALS_PATH } from "../../../constants/paths.js";
import { writeJson } from "../../../lib/fileIo.js";

/** Validate and persist credentials.json (api_key) with 0o600 permissions. */
export async function saveCredentials(
  credentials: EntrezCredentials,
  path: string = CREDENTIALS_PATH,
): Promise<void> {
  const validated = EntrezCredentialsSchema.parse(credentials);
  await writeJson(path, validated, { mode: 0o600 });
}
