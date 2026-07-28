import { type Server, createServer } from 'node:http';

import type {
  ConfigScope,
  ConfigScopeState,
} from '@ogham/cross-platform/config-scope';
import { generateToken } from '@ogham/http-kit/token';

import { SETTINGS_SERVER_IDLE_MS } from '../../../../constants/defaults.js';
import {
  loadConfig as loadConfigDefault,
  loadConfigState as loadConfigStateDefault,
  saveConfig as saveConfigDefault,
} from '../../../../core/configManager/index.js';
import {
  type YoutubeProvisionSummary,
  provisionYoutube as provisionYoutubeImpl,
} from '../../../../core/youtubeMcp/index.js';
import type {
  Config,
  SettingsServerHandle,
  YoutubeAddonConfig,
} from '../../../../types/index.js';

import { createRouteHandler } from './routing/routes.js';

export interface StartSettingsServerOptions {
  settingsHtml: string;
  idleMs?: number;
  loadConfig?: () => Promise<Config>;
  loadConfigState?: () => ConfigScopeState;
  saveConfig?: (
    scope: ConfigScope,
    document: Record<string, unknown>,
  ) => Promise<ConfigScopeState>;
  provisionYoutube?: (
    next: YoutubeAddonConfig,
    prev?: YoutubeAddonConfig,
  ) => Promise<YoutubeProvisionSummary>;
  onClose?: () => void | Promise<void>;
}

export interface SettingsServerInstance extends SettingsServerHandle {
  port: number;
}

export async function startSettingsServer(
  options: StartSettingsServerOptions,
): Promise<SettingsServerInstance> {
  let server: Server | null = null;
  let shutdownTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const idleMs = options.idleMs ?? SETTINGS_SERVER_IDLE_MS;
  const token = generateToken();
  const loadConfigImpl = options.loadConfig ?? loadConfigDefault;
  const loadConfigStateImpl = options.loadConfigState ?? loadConfigStateDefault;
  const saveConfigImpl = options.saveConfig ?? saveConfigDefault;
  let currentConfig: Config | null = null;

  async function loadCurrentConfig(): Promise<Config> {
    currentConfig = await loadConfigImpl();
    return currentConfig;
  }

  async function saveAndReloadConfig(
    scope: ConfigScope,
    document: Record<string, unknown>,
  ): Promise<ConfigScopeState> {
    const state = await saveConfigImpl(scope, document);
    currentConfig = await loadConfigImpl();
    return state;
  }

  async function closeServer(): Promise<void> {
    if (closed) return;
    closed = true;
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = null;
    }
    if (server) {
      const s = server;
      server = null;
      await new Promise<void>((resolve) => {
        if (typeof s.closeAllConnections === 'function')
          s.closeAllConnections();
        s.close(() => resolve());
      });
    }
    if (options.onClose)
      try {
        await options.onClose();
      } catch {
        // best-effort cleanup hook
      }
  }

  function resetTimer(): void {
    if (closed) return;
    if (shutdownTimer) clearTimeout(shutdownTimer);
    shutdownTimer = setTimeout(() => {
      void closeServer();
    }, idleMs);
  }

  const handler = createRouteHandler({
    token,
    settingsHtml: options.settingsHtml,
    loadConfig: loadCurrentConfig,
    loadConfigState: loadConfigStateImpl,
    saveConfig: saveAndReloadConfig,
    provisionYoutube:
      options.provisionYoutube ??
      ((next, prev) => provisionYoutubeImpl(next, prev)),
    closeServer,
    resetTimer,
  });

  server = createServer(handler);

  const { url, port } = await new Promise<{ url: string; port: number }>(
    (resolve, reject) => {
      server!.listen(0, '127.0.0.1', () => {
        const addr = server!.address();
        if (addr && typeof addr === 'object')
          resolve({
            url: `http://127.0.0.1:${addr.port}/?token=${token}`,
            port: addr.port,
          });
        else reject(new Error('Failed to get server address'));
      });
      server!.on('error', reject);
    },
  );

  resetTimer();

  return {
    url,
    token,
    port,
    close: closeServer,
  };
}
