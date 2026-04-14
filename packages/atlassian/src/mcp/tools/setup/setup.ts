import type { SetupServerHandle } from '../../../types/index.js';
import { loadConfig, saveConfig, loadCredentials, saveCredentials } from '../../../core/index.js';
import { startSetupServer } from './web-server/web-server.js';
import { testConnection } from './connection-tester/connection-tester.js';
import { SETUP_HTML } from './__generated__/setup-html.js';

interface SetupParams {
  mode?: 'new' | 'edit';
}

interface SetupResult {
  success: boolean;
  message: string;
  url?: string;
}

/** Setup tool handler — launches local web server for auth configuration */
export async function handleSetup(params: SetupParams): Promise<SetupResult> {
  const mode = params.mode ?? 'new';

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
    const message = err instanceof Error ? err.message : 'Failed to start setup server';
    return { success: false, message };
  }

  return {
    success: true,
    message: `Setup server started (${mode} mode). Open the URL below in your browser to configure Atlassian connection.`,
    url: handle.url,
  };
}
