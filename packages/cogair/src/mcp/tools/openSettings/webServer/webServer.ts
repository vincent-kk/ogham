import { type Server, createServer } from 'node:http';

import { generateToken } from '../../../../core/authToken/index.js';
import {
  loadConfig as loadConfigDefault,
  saveConfig as saveConfigDefault,
} from '../../../../core/configManager/index.js';
import type { Config, SettingsServerHandle } from '../../../../types/index.js';

import { createRouteHandler } from './routes.js';

const DEFAULT_IDLE_MS = 5 * 60 * 1000;

export interface StartSettingsServerOptions {
  settingsHtml: string;
  idleMs?: number;
  loadConfig?: () => Promise<Config>;
  saveConfig?: (config: Config) => Promise<void>;
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

  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
  const token = generateToken();

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
        s.close(() => resolve());
      });
    }
    if (options.onClose) {
      try {
        await options.onClose();
      } catch {
        // best-effort cleanup hook
      }
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
    loadConfig: options.loadConfig ?? loadConfigDefault,
    saveConfig: options.saveConfig ?? saveConfigDefault,
    closeServer,
    resetTimer,
  });

  server = createServer(handler);

  const { url, port } = await new Promise<{ url: string; port: number }>(
    (resolve, reject) => {
      server!.listen(0, '127.0.0.1', () => {
        const addr = server!.address();
        if (addr && typeof addr === 'object') {
          resolve({
            url: `http://127.0.0.1:${addr.port}/?token=${token}`,
            port: addr.port,
          });
        } else {
          reject(new Error('Failed to get server address'));
        }
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
