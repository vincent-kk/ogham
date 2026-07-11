import { stableJson } from "../../json/stableJson.js";
import type { PluginIR } from "../../types/ir.js";
import type { FileMap } from "../../types/output.js";
import type { HostProfile } from "../../types/profile.js";

/** Emit the plugin manifest at the profile's manifest path. */
export function emitManifest(ir: PluginIR, profile: HostProfile): FileMap {
  const json = stableJson(profile.buildManifest(ir));
  return new Map([[profile.manifestPath, Buffer.from(json, "utf8")]]);
}
