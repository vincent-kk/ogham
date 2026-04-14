import {
  loadConfig,
  loadCredentials,
  saveConfig,
  saveCredentials,
} from "../../../core/index.js";
import type { SetupServerHandle, SetupParams, SetupResult } from "../../../types/index.js";
import { SETUP_HTML } from "./__generated__/setup-html.js";
import { testConnection } from "../../../core/index.js";
import { openBrowser } from "./utils/openBrowser.js";
import { startSetupServer } from "./web-server/web-server.js";

/** Setup tool handler — launches local web server for auth configuration */
export async function handleSetup(params: SetupParams): Promise<SetupResult> {
  const mode = params.mode ?? "new";

  let handle: SetupServerHandle;
  try {
    handle = await startSetupServer({
      mode,
      context: {
        setupHtml: SETUP_HTML,
        loadConfig,
        saveConfig,
        loadCredentials,
        saveCredentials,
        testConnection,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start setup server";
    return { success: false, message };
  }

  openBrowser(handle.url);

  return {
    success: true,
    message: `Setup server started (${mode} mode). Browser opened automatically.`,
    url: handle.url,
  };
}
