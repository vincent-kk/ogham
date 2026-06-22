import { openBrowser } from "../../../utils/openBrowser.js";
import { ensureHttpServer } from "../../httpServer/index.js";

export interface OpenSettingsOutput {
  url: string;
}

/** open_settings: ensure the local server is up and open the settings page. */
export async function handleOpenSettings(): Promise<OpenSettingsOutput> {
  const server = await ensureHttpServer();
  const url = server.settingsUrl();
  openBrowser(url);
  return { url };
}
