import {
  resolveConfigLayers,
  type ConfigLayerPaths,
  tryProjectRoot,
} from "@ogham/cross-platform";

/**
 * Where deilen's two config layers live for the current workspace.
 *
 * The project root is reached for rather than passed in, because loadConfig is
 * called from tool handlers and server lifecycle code that have no workspace
 * argument to thread. `tryProjectRoot()` yields `process.cwd()` on Claude and
 * the remembered root elsewhere; when nothing supplied one it returns null and
 * the project layer switches off. Pass `projectRoot` explicitly in tests so a
 * run never writes into the repository it happens to execute from.
 */
export function configLayers(
  projectRoot: string | null = tryProjectRoot(),
): ConfigLayerPaths {
  return resolveConfigLayers({ pluginName: "deilen", projectRoot });
}
