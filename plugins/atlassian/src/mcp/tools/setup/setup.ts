import {
  loadConfig,
  loadConfigByScope,
  loadConfigScope,
  loadCredentials,
  saveConfig,
  saveCredentials,
} from "../../../core/index.js";
import type {
  SetupServerHandle,
  SetupParams,
  SetupResult,
} from "../../../types/index.js";
import { loadSettingsHtml } from "./utils/loadSettingsHtml.js";
import { testConnection } from "../../../core/index.js";
import { openBrowser } from "@ogham/cross-platform";
import { startSetupServer } from "./webServer/index.js";

/** Setup tool handler — launches local web server for auth configuration */
export async function handleSetup(params: SetupParams): Promise<SetupResult> {
  const mode = params.mode ?? "new";

  let handle: SetupServerHandle;
  try {
    handle = await startSetupServer({
      context: {
        settingsHtml: loadSettingsHtml(),
        loadConfig,
        loadConfigByScope,
        loadConfigScope,
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

  const completion = await handle.completion;
  if (!completion.success) return completion;

  return {
    ...completion,
    message: `${completion.message} (${mode} mode).`,
    url: handle.url,
  };
}
