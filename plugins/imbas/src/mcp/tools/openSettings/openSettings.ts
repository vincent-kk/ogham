import { projectRoot } from '@ogham/cross-platform/host-paths';
import { openBrowser } from '@ogham/cross-platform/launcher';

import type {
  SettingsBootstrap,
  SettingsSaveSummary,
} from '../../../types/settings.js';

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
  project_root?: string;
  wait_seconds?: number;
  bootstrap?: SettingsBootstrap;
}

/** Subset of the MCP request extra this handler consumes. */
export interface OpenSettingsToolExtra {
  signal?: AbortSignal;
}

export interface OpenSettingsOutput {
  status: 'saved' | 'closed' | 'pending';
  url: string;
  summary?: SettingsSaveSummary;
  message: string;
}

interface ActiveServer extends SettingsServerInstance {
  projectRoot: string;
}

let currentServer: ActiveServer | null = null;
let currentBootstrap: SettingsBootstrap = {};

/**
 * open_settings: start (or reuse) the local settings server, open the
 * browser form, then long-poll until the user saves, the page closes, or
 * the bounded wait elapses. `pending` keeps the server alive — a repeat
 * call resumes waiting on the same session, refreshing the bootstrap facts
 * when new ones are supplied.
 */
export async function handleOpenSettings(
  input: OpenSettingsInput,
  extra?: OpenSettingsToolExtra,
): Promise<OpenSettingsOutput> {
  const root = projectRoot(input.project_root);
  if (input.bootstrap) currentBootstrap = input.bootstrap;

  // A server bound to another project cannot serve this one — replace it.
  if (currentServer && currentServer.projectRoot !== root)
    await currentServer.close();

  if (!currentServer) {
    const handle = await startSettingsServer({
      settingsHtml: loadSettingsHtml(),
      loadState: () => buildSettingsState(root, currentBootstrap),
      persistSave: (body) => persistSave(root, body),
      onClose: () => {
        currentServer = null;
      },
    });
    currentServer = { ...handle, projectRoot: root };
    // IMBAS_NO_BROWSER=1 suppresses the tab for e2e runs and headless hosts;
    // the URL still returns so callers can surface it.
    if (process.env.IMBAS_NO_BROWSER !== '1') openBrowser(handle.url);
  }

  const server = currentServer;
  // server.url carries a one-time auth token in its query string. Only the
  // browser (opened above) and a manual reopen of a still-pending page need
  // it, so terminal states return the token-less base URL and never echo the
  // token once the flow ends. Loopback binding + Host/Origin/token checks
  // bound the residual risk of the token that pending responses still surface.
  const baseUrl = new URL(server.url).origin + '/';
  const wait = Math.min(
    Math.max(input.wait_seconds ?? DEFAULT_WAIT_SECONDS, 1),
    MAX_WAIT_SECONDS,
  );
  const event = await server.awaitSettled(wait, extra?.signal);

  if (event.kind === 'saved')
    return {
      status: 'saved',
      url: baseUrl,
      summary: event.summary,
      message: 'Settings saved. Continue with the persisted config.',
    };
  if (event.kind === 'closed')
    return {
      status: 'closed',
      url: baseUrl,
      message:
        'Settings page closed without saving. Existing config is unchanged.',
    };
  return {
    status: 'pending',
    url: server.url,
    message: `No submission within ${wait}s. The page is still open — call open_settings again to keep waiting, or proceed with the existing config.`,
  };
}
