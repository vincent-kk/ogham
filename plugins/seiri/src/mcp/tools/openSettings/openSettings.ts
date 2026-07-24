import { pluginRoot } from '@ogham/cross-platform/host-paths';
import { projectRoot } from '@ogham/cross-platform/host-paths';
import { openBrowser } from '@ogham/cross-platform/launcher';

import { ENV_FLAG_ON, ENV_NO_BROWSER } from '../../../constants/env.js';
import { Route } from '../../../constants/http.js';

import type { SaveSummary } from './types/settingsTypes.js';
import { buildSettingsState } from './utils/buildSettingsState.js';
import { loadSettingsHtml } from './utils/loadSettingsHtml.js';
import { persistSave } from './utils/persistSave.js';
import { planSave } from './utils/planSave.js';
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

/** The slice of the MCP request extra this handler consumes. */
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
 * Start (or reuse) the local settings server, open the browser form, then
 * long-poll until the user saves, closes the page, or the bounded wait
 * elapses.
 *
 * The wait is what lets the setup skill continue in the same turn instead
 * of handing the user a URL and stopping. `pending` keeps the server
 * alive so a repeat call resumes the same session.
 */
export async function handleOpenSettings(
  input: OpenSettingsInput,
  extra?: OpenSettingsToolExtra,
): Promise<OpenSettingsOutput> {
  const root = projectRoot(input.path);
  const plugin = pluginRoot();
  if (plugin === null)
    throw new Error(
      'Cannot locate the seiri plugin directory, so the rule templates it ships are unreachable. Reinstall the plugin, or retry once CLAUDE_PLUGIN_ROOT is set.',
    );

  // A server bound to another project cannot serve this one — replace it.
  if (currentServer && currentServer.projectRoot !== root)
    await currentServer.close();

  if (!currentServer) {
    const handle = await startSettingsServer({
      settingsHtml: loadSettingsHtml(),
      loadState: () => buildSettingsState(root, plugin),
      planSave: (body) => planSave(root, plugin, body),
      persistSave: (body) => persistSave(root, plugin, body),
      onClose: () => {
        currentServer = null;
      },
    });
    currentServer = { ...handle, projectRoot: root };
    // ENV_NO_BROWSER suppresses the tab for e2e runs and headless
    // hosts; the URL is still returned so callers can surface it.
    if (process.env[ENV_NO_BROWSER] !== ENV_FLAG_ON) openBrowser(handle.url);
  }

  const server = currentServer;
  // server.url carries a one-time token. Only the browser opened above and
  // a manual reopen of a still-pending page need it, so terminal states
  // return the token-less origin and never echo it once the flow ends.
  const baseUrl = `${new URL(server.url).origin}${Route.ROOT}`;
  const wait = Math.min(
    Math.max(input.waitSeconds ?? DEFAULT_WAIT_SECONDS, 1),
    MAX_WAIT_SECONDS,
  );
  const event = await server.awaitSettled(wait, extra?.signal);

  if (event.kind === 'saved')
    return {
      status: 'saved',
      url: baseUrl,
      summary: event.summary,
      message: 'Settings saved. Continue with the persisted configuration.',
    };

  if (event.kind === 'closed')
    return {
      status: 'closed',
      url: baseUrl,
      message:
        'Settings page closed without saving. The existing configuration is unchanged.',
    };

  return {
    status: 'pending',
    url: server.url,
    message: `No submission within ${wait}s. The page is still open — call open_settings again to keep waiting, or proceed with the existing configuration.`,
  };
}
