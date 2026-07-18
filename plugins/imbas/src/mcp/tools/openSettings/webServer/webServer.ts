import { type Server, createServer } from 'node:http';

import { generateToken } from '@ogham/http-guard/token';

import type {
  SettingsPageState,
  SettingsSaveBody,
  SettingsSaveSummary,
  SettingsSettleEvent,
} from '../../../../types/settings.js';

import { createRouteHandler } from './routing/routes.js';

export const SETTINGS_SERVER_IDLE_MS = 5 * 60 * 1000;

export interface StartSettingsServerOptions {
  settingsHtml: string;
  loadState: () => Promise<SettingsPageState>;
  persistSave: (body: SettingsSaveBody) => Promise<SettingsSaveSummary>;
  idleMs?: number;
  onClose?: () => void | Promise<void>;
}

export interface SettingsServerInstance {
  url: string;
  token: string;
  port: number;
  /** Wait until the user saves or the server closes; `pending` on timeout/abort. */
  awaitSettled: (
    waitSeconds: number,
    signal?: AbortSignal,
  ) => Promise<SettingsSettleEvent>;
  close: () => Promise<void>;
}

export async function startSettingsServer(
  options: StartSettingsServerOptions,
): Promise<SettingsServerInstance> {
  let server: Server | null = null;
  let shutdownTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let settleResolvers: Array<(event: SettingsSettleEvent) => void> = [];

  const idleMs = options.idleMs ?? SETTINGS_SERVER_IDLE_MS;
  const token = generateToken();

  function settle(event: SettingsSettleEvent): void {
    const resolvers = settleResolvers;
    settleResolvers = [];
    for (const resolve of resolvers) resolve(event);
  }

  function awaitSettled(
    waitSeconds: number,
    signal?: AbortSignal,
  ): Promise<SettingsSettleEvent> {
    if (closed) return Promise.resolve({ kind: 'closed' });
    return new Promise((resolve) => {
      let done = false;
      const finish = (event: SettingsSettleEvent): void => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        settleResolvers = settleResolvers.filter((r) => r !== entry);
        resolve(event);
      };
      const entry = (event: SettingsSettleEvent): void => finish(event);
      const onAbort = (): void => finish({ kind: 'pending' });
      const timer = setTimeout(
        () => finish({ kind: 'pending' }),
        waitSeconds * 1000,
      );
      settleResolvers.push(entry);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  async function closeServer(): Promise<void> {
    if (closed) return;
    closed = true;
    settle({ kind: 'closed' });
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
      // An active waiter means the tool is still long-polling for the user's
      // save — extend instead of closing the form under them.
      if (settleResolvers.length > 0) {
        resetTimer();
        return;
      }
      void closeServer();
    }, idleMs);
  }

  const handler = createRouteHandler({
    token,
    settingsHtml: options.settingsHtml,
    loadState: options.loadState,
    persistSave: options.persistSave,
    settleSaved: (summary) => settle({ kind: 'saved', summary }),
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
    awaitSettled,
    close: closeServer,
  };
}
