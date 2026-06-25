/**
 * @file paths.ts
 * @description Filesystem path constants and helpers. Config/credentials live
 * under the plugin cache dir; manifests/jobs/downloads are siblings.
 */
import { join } from "node:path";

import { pluginCache } from "@ogham/cross-platform/paths";

/** Root data directory for the entrez plugin. */
export const PLUGIN_DATA_DIR = pluginCache("entrez");

/** Non-secret config file. */
export const CONFIG_PATH = join(PLUGIN_DATA_DIR, "config.json");

/** Secret credentials file (api_key), written 0o600. */
export const CREDENTIALS_PATH = join(PLUGIN_DATA_DIR, "credentials.json");

/** SearchManifest output directory (reproducibility snapshots). */
export const MANIFEST_DIR = join(PLUGIN_DATA_DIR, "manifests");

/** Default full-text download directory. */
export const DOWNLOAD_DIR = join(PLUGIN_DATA_DIR, "downloads");

/** Async search job registry directory. */
export const JOB_DIR = join(PLUGIN_DATA_DIR, "jobs");

const JSON_EXT = ".json";

/** Path to a SearchManifest JSON by id. */
export function manifestPath(id: string): string {
  return join(MANIFEST_DIR, `${id}${JSON_EXT}`);
}

/** Path to an async job record JSON by id. */
export function jobPath(id: string): string {
  return join(JOB_DIR, `${id}${JSON_EXT}`);
}
