import { openBrowser } from "@ogham/cross-platform/launcher";

import type {
  SetupParams,
  SetupResult,
  SetupServerHandle,
  SetupFormData,
} from "../../../types/setup.js";
import {
  loadConfig,
  loadCredentials,
  saveConfig,
  saveCredentials,
} from "../../../core/config/index.js";
import { startSetupServer } from "./webServer/index.js";
import { loadSettingsHtml } from "./utils/loadSettingsHtml.js";
import { testConnection } from "./utils/testConnection.js";

/**
 * setup tool — launch the local web server for configuration and open the
 * browser. The LLM only triggers this and reports { success, url }; the
 * api_key flows browser → server → credentials.json (0o600), never the chat.
 */
export async function handleSetup(
  params: SetupParams = {},
): Promise<SetupResult> {
  const mode = params.mode ?? "new";

  let handle: SetupServerHandle;
  try {
    handle = await startSetupServer({
      context: {
        settingsHtml: loadSettingsHtml(),
        loadConfig,
        loadCredentials,
        saveConfig,
        saveCredentials,
        testConnection: (data: SetupFormData) => testConnection(data),
      },
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to start setup server",
    };
  }

  openBrowser(handle.url);
  return {
    success: true,
    message: `Setup server started (${mode} mode). Browser opened automatically.`,
    url: handle.url,
  };
}
