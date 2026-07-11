import type { HostId } from "../types/output.js";
import type { HostProfile } from "../types/profile.js";
import { agyProfile } from "./agy.js";
import { claudeProfile } from "./claude.js";
import { codexProfile } from "./codex.js";

const PROFILES: Partial<Record<HostId, HostProfile>> = {
  claude: claudeProfile,
  codex: codexProfile,
  agy: agyProfile,
};

/** Get the profile for a host, or throw if unimplemented. */
export function getProfile(id: HostId): HostProfile {
  const profile = PROFILES[id];
  if (!profile) throw new Error(`no host profile for '${id}'`);
  return profile;
}

/** Host ids that currently have a profile. */
export function availableHosts(): HostId[] {
  return Object.keys(PROFILES) as HostId[];
}
