import type { ConfigScope } from "../../types/types.js";

/** Select the existing layer to edit, defaulting fresh setups to project. */
export function resolveInitialConfigScope(layers: {
  readonly user: object | null;
  readonly project: object | null;
}): ConfigScope {
  if (layers.project !== null) return "project";
  return layers.user !== null ? "user" : "project";
}
