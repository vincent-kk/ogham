import { projectRoot } from "@ogham/cross-platform/host-paths";

import { openBrowser } from "@ogham/cross-platform/launcher";
import { ensureHttpServer } from "../../httpServer/index.js";

export interface OpenSettingsInput {
  project_root?: string;
}

export interface OpenSettingsOutput {
  url: string;
}

/** open_settings: ensure the local server is up and open the settings page. */
export async function handleOpenSettings(
  input: OpenSettingsInput = {},
): Promise<OpenSettingsOutput> {
  const workspace = projectRoot(input.project_root);
  const server = await ensureHttpServer(workspace);
  const url = server.settingsUrl();
  openBrowser(url);
  return { url };
}
