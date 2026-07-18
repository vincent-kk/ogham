import { projectRoot } from '@ogham/cross-platform/host-paths';
import { openBrowser } from '@ogham/cross-platform/launcher';

import type { SaveSummary } from './types/settingsTypes.js';
import { buildSettingsState } from './utils/buildSettingsState.js';
import { loadSettingsHtml } from './utils/loadSettingsHtml.js';
import { persistSave } from './utils/persistSave.js';
import {
  type SettingsServerInstance,
  startSettingsServer,
} from './webServer/index.js';

export const DEFAULT_WAIT_SECONDS = 300;
export const MAX_WAIT_SECONDS = 600;

export interface OpenSettingsInput {
  path?: string;
  waitSeconds?: number;
}

/** Subset of the MCP request extra this handler consumes. */
export interface OpenSettingsToolExtra {
  signal?: AbortSignal;
}

export interface OpenSettingsOutput {
  status: 'saved' | 'closed' | 'pending';
  url: string;
  summary?: SaveSummary;
  message: string;
}

interface ActiveServer extends SettingsServerInstance {
  projectRoot: string;
}

let currentServer: ActiveServer | null = null;

/**
 * open_settings: start (or reuse) the local settings server, open the
 * browser form, then long-poll until the user saves, the page closes, or
 * the bounded wait elapses. `pending` keeps the server alive — a repeat
 * call resumes waiting on the same session.
 */
export async function handleOpenSettings(
  input: OpenSettingsInput,
  extra?: OpenSettingsToolExtra,
): Promise<OpenSettingsOutput> {
  const root = projectRoot(input.path);

  // A server bound to another project cannot serve this one — replace it.
  if (currentServer && currentServer.projectRoot !== root)
    await currentServer.close();

  if (!currentServer) {
    const handle = await startSettingsServer({
      settingsHtml: loadSettingsHtml(),
      loadState: () => buildSettingsState(root),
      persistSave: (body) => persistSave(root, body),
      onClose: () => {
        currentServer = null;
      },
    });
    currentServer = { ...handle, projectRoot: root };
    // FILID_NO_BROWSER=1 suppresses the tab for e2e runs and headless hosts;
    // the URL still returns so callers can surface it.
    if (process.env.FILID_NO_BROWSER !== '1') openBrowser(handle.url);
  }

  const server = currentServer;
  const wait = Math.min(
    Math.max(input.waitSeconds ?? DEFAULT_WAIT_SECONDS, 1),
    MAX_WAIT_SECONDS,
  );
  const event = await server.awaitSettled(wait, extra?.signal);

  if (event.kind === 'saved')
    return {
      status: 'saved',
      url: server.url,
      summary: event.summary,
      message: 'Settings saved. Continue with the persisted config.',
    };
  if (event.kind === 'closed')
    return {
      status: 'closed',
      url: server.url,
      message:
        'Settings page closed without saving. Existing config is unchanged.',
    };
  return {
    status: 'pending',
    url: server.url,
    message: `No submission within ${wait}s. The page is still open at ${server.url} — call open_settings again to keep waiting, or proceed with the existing config.`,
  };
}
