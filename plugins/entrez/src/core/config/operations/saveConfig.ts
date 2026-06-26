import type { EntrezConfigInput } from "../../../types/config.js";
import { EntrezConfigSchema } from "../../../types/config.js";
import { CONFIG_PATH } from "../../../constants/paths.js";
import { writeJson } from "../../../lib/fileIo.js";

/**
 * Validate and persist config.json with owner-only permissions (0o600). `email`
 * is a sensitive identifier, so config is protected from other local users.
 */
export async function saveConfig(
  config: EntrezConfigInput,
  path: string = CONFIG_PATH,
): Promise<void> {
  const validated = EntrezConfigSchema.parse(config);
  await writeJson(path, validated, { mode: 0o600 });
}
