import type { PluginIR } from "../../types/ir.js";
import type { FileMap } from "../../types/output.js";

/**
 * Copy the plugin's verbatim assets (bridge/, libs/, README.md, …) into the
 * target so each install directory is self-contained. Host-neutral — no profile.
 */
export function emitAssets(ir: PluginIR): FileMap {
  return new Map(ir.runtimeFiles.map((f) => [f.relPath, f.bytes]));
}
