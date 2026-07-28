import { configLayers } from './configLayers.js';

/**
 * Absolute path of a project's `.seiri/config.json` — the project layer.
 *
 * Anchored at the repository root, not at the caller's directory, so the
 * dial a team commits applies from every subdirectory of the checkout.
 * The user layer beneath it is reached through {@link configLayers}.
 *
 * Never null: the project layer is always addressable because seiri always
 * has a project root to anchor to.
 */
export function resolveConfigPath(projectRoot: string): string {
  return configLayers(projectRoot).project as string;
}
