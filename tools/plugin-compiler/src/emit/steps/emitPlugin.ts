import type { PluginIR } from "../../types/ir.js";
import type { FileMap } from "../../types/output.js";
import type { HostProfile } from "../../types/profile.js";
import { emitAgents } from "./emitAgents.js";
import { emitAssets } from "./emitAssets.js";
import { emitHooks } from "./emitHooks.js";
import { emitManifest } from "./emitManifest.js";
import { emitMcp } from "./emitMcp.js";
import { emitSkill } from "./emitSkill.js";

/**
 * Emit the full self-contained target tree for one host: manifest, MCP config,
 * skills, agents, hooks, and verbatim assets. Pure — returns a FileMap, touches
 * no disk. Later steps override earlier ones on key collision (none expected).
 */
export function emitPlugin(ir: PluginIR, profile: HostProfile): FileMap {
  const files: FileMap = new Map();
  mergeInto(files, emitManifest(ir, profile));
  mergeInto(files, emitMcp(ir, profile));
  for (const skill of ir.skills)
    mergeInto(files, emitSkill(skill, ir, profile));
  mergeInto(files, emitAgents(ir, profile));
  mergeInto(files, emitHooks(ir, profile));
  mergeInto(files, emitAssets(ir));
  return files;
}

function mergeInto(into: FileMap, from: FileMap): void {
  for (const [key, value] of from) into.set(key, value);
}
