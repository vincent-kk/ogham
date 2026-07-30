import { chmod, stat } from "node:fs/promises";

import {
  mergeConfigLayers,
  readConfigLayers,
  type ConfigLayerPaths,
} from "@ogham/cross-platform";

import type { EntrezConfig } from "../../../types/config.js";
import { EntrezConfigSchema } from "../../../types/config.js";
import { configLayers } from "../utils/configLayers.js";

/** Tighten a pre-existing file created under a permissive umask. */
async function tightenIfLoose(path: string | null): Promise<void> {
  if (path === null) return;
  try {
    const s = await stat(path);
    if ((s.mode & 0o077) !== 0) await chmod(path, 0o600);
  } catch {
    // ENOENT expected on first run.
  }
}

/**
 * The config in effect: the user layer with the project layer laid over it.
 *
 * Returns null when the merge does not describe a configured install — `tool`
 * and `email` are required, so an absent or incomplete config is "not set up"
 * rather than an empty one. That contract is unchanged; what changed is that
 * either layer may supply the missing half.
 *
 * Only the merged result is validated: a project layer naming just `tool`
 * cannot satisfy the schema alone, and rejecting it there would defeat the
 * point of having layers.
 */
export async function loadConfig(
  layers: ConfigLayerPaths = configLayers(),
): Promise<EntrezConfig | null> {
  await tightenIfLoose(layers.user);
  await tightenIfLoose(layers.project);

  const documents = readConfigLayers(layers);
  if (documents.user === null && documents.project === null) return null;

  const parsed = EntrezConfigSchema.safeParse(
    mergeConfigLayers(documents.user, documents.project),
  );
  return parsed.success ? parsed.data : null;
}
