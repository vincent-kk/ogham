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
    openBrowser(handle.url);
  }

  const server = currentServer;
  const wait = Math.min(
    Math.max(input.wait_seconds ?? DEFAULT_WAIT_SECONDS, 1),
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
