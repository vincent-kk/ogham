import type { ConfigLayerPaths } from "@ogham/cross-platform/config-scope";

import { logger } from "../../../lib/logger.js";
import { ConfigSchema } from "../../../types/config.js";

import { migrateConfig } from "./migrateConfig.js";
import { saveConfig } from "./saveConfig.js";

/**
 * Upgrade a legacy user layer to CONFIG_VERSION and write it back when it moved.
 *
 * Only the user layer is migrated. The project layer did not exist before this
 * feature, so no legacy document can be sitting there, and it holds only the
 * overridden keys — it is not the owner of the version stamp.
 *
 * Returns the document the caller should merge from, so a migration that just
 * ran is reflected in this load rather than only the next one.
 */
export async function migrateUserLayer(
  layers: ConfigLayerPaths,
  rawUser: Record<string, unknown> | null,
): Promise<Record<string, unknown> | null> {
  if (rawUser === null) return null;

  const parsed = ConfigSchema.safeParse(rawUser);
  // A damaged user layer is not this function's problem — the merged validation
  // downstream reports it and falls back to defaults.
  if (!parsed.success) return rawUser;
  if (!migrateConfig(parsed.data)) return rawUser;

  const migrated = parsed.data as unknown as Record<string, unknown>;
  await saveConfig("user", migrated, layers).catch((error: unknown) =>
    logger.warn("config migration not persisted", {
      error: (error as Error).message,
    }),
  );
  return migrated;
}
