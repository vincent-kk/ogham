import { readFile } from "node:fs/promises";

import { DEFAULT_CONFIG } from "../../../constants/defaults.js";
import { CONFIG_PATH } from "../../../constants/paths.js";
import { logger } from "../../../lib/logger.js";
import { type Config, ConfigSchema } from "../../../types/config.js";
import { isFileNotFound } from "../../../utils/isFileNotFound.js";

import { migrateConfig } from "./migrateConfig.js";
import { saveConfig } from "./saveConfig.js";

/** Read + validate config.json, migrating legacy versions once; fall back to defaults. */
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
  const config = parsed.data;
  if (migrateConfig(config))
    await saveConfig(config).catch((err: unknown) =>
      logger.warn("config migration not persisted", {
        error: (err as Error).message,
      }),
    );
  return config;
}
