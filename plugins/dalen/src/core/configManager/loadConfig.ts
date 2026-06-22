import { readFile } from "node:fs/promises";

import { DEFAULT_CONFIG } from "../../constants/defaults.js";
import { CONFIG_PATH } from "../../constants/paths.js";
import { logger } from "../../lib/logger.js";
import { type Config, ConfigSchema } from "../../types/config.js";
import { isFileNotFound } from "../../utils/isFileNotFound.js";

/** Read + validate config.json, filling Zod defaults; fall back to defaults. */
export async function loadConfig(): Promise<Config> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(CONFIG_PATH, "utf8"));
  } catch (err) {
    if (isFileNotFound(err)) return DEFAULT_CONFIG;
    logger.warn("config.json unreadable, using defaults", {
      error: (err as Error).message,
    });
    return DEFAULT_CONFIG;
  }
  const parsed = ConfigSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn("config.json invalid, using defaults", {
      issues: parsed.error.issues,
    });
    return DEFAULT_CONFIG;
  }
  return parsed.data;
}
