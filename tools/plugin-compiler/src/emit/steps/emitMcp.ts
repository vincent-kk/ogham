import { stableJson } from "../../json/stableJson.js";
import type { PluginIR } from "../../types/ir.js";
import type { FileMap } from "../../types/output.js";
import type { HostProfile } from "../../types/profile.js";

/** Emit the MCP config file, or nothing when the host or plugin has no MCP. */
export function emitMcp(ir: PluginIR, profile: HostProfile): FileMap {
  if (!profile.mcpPath) return new Map();
  const config = profile.buildMcp(ir);
  if (!config) return new Map();
  return new Map([[profile.mcpPath, Buffer.from(stableJson(config), "utf8")]]);
}
