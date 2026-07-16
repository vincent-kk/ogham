import { CONFIG_VERSION, type Config } from "../../../types/config.js";

// One step per version bump: migrations[v] upgrades a version-v config to v+1.
// Steps are frozen in time — literals only, never live defaults.
const migrations: ReadonlyArray<(config: Config) => void> = [
  // v0 -> v1: 45 was the hard-coded default before the 45s -> 600s bump, so a
  // stored 45 reads as "never touched"; any other value is a deliberate choice.
  (config) => {
    if (config.collect_timeout_seconds === 45)
      config.collect_timeout_seconds = 600;
  },
];

if (migrations.length !== CONFIG_VERSION)
  throw new Error(
    `configManager: ${migrations.length} migration steps but CONFIG_VERSION is ${CONFIG_VERSION}`,
  );

/** Upgrade config in place to CONFIG_VERSION; true when it was below. */
export function migrateConfig(config: Config): boolean {
  if (config.config_version >= CONFIG_VERSION) return false;
  for (const step of migrations.slice(config.config_version)) step(config);
  config.config_version = CONFIG_VERSION;
  return true;
}
