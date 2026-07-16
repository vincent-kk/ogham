import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import {
  CONFIG_VERSION,
  type Config,
  ConfigSchema,
} from "../../../types/config.js";

/**
 * Validate and atomically persist config.json, stamped at CONFIG_VERSION.
 * The stamp is unconditional: callers (settings form POST) may carry version 0,
 * and a 0 on disk would re-run every migration on the next load.
 */
export async function saveConfig(config: Config): Promise<void> {
  const validated = ConfigSchema.parse({
    ...config,
    config_version: CONFIG_VERSION,
  });
  await atomicWrite(CONFIG_PATH, `${JSON.stringify(validated, null, 2)}\n`);
}
