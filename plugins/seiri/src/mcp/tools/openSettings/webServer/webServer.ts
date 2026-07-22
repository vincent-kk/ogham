import { type Server, createServer } from 'node:http';

import { generateToken } from '@ogham/http-guard/token';

import { LOOPBACK_HOST, Route } from '../../../../constants/http.js';
import { INJECTION_PREFIX } from '../../../../constants/plugin.js';
import type { RuleDocSyncResult } from '../../../../types/manifest.js';
import type {
  SaveBody,
  SaveSummary,
  SettingsPageState,
  SettleEvent,
} from '../types/settingsTypes.js';

import { createRouteHandler } from './routing/routes.js';

export const SETTINGS_SERVER_IDLE_MS = 5 * 60 * 1000;

export interface StartSettingsServerOptions {
  settingsHtml: string;
  loadState: () => SettingsPageState;
  planSave: (body: SaveBody) => RuleDocSyncResult;
  persistSave: (body: SaveBody) => SaveSummary;
  idleMs?: number;
  onClose?: () => void | Promise<void>;
}

export interface SettingsServerInstance {
  url: string;
  token: string;
  port: number;
  /** Wait until the user saves or the page closes; `pending` on timeout/abort. */
  awaitSettled: (
    waitSeconds: number,
    signal?: AbortSignal,
  ) => Promise<SettleEvent>;
  close: () => Promise<void>;
}

export async function startSettingsServer(
  options: StartSettingsServerOptions,
): Promise<SettingsServerInstance> {
  let server: Server | null = null;
  let shutdownTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let serverStarted = false;
  let settleResolvers: Array<(event: SettleEvent) => void> = [];

  const idleMs = options.idleMs ?? SETTINGS_SERVER_IDLE_MS;
  const token = generateToken();

  function settle(event: SettleEvent): void {
    const resolvers = settleResolvers;
    settleResolvers = [];
    for (const resolve of resolvers) resolve(event);
  }

  function awaitSettled(
    waitSeconds: number,
    signal?: AbortSignal,
  ): Promise<SettleEvent> {
    if (closed) return Promise.resolve({ kind: 'closed' });
    return new Promise((resolve) => {
      let done = false;
      const finish = (event: SettleEvent): void => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        settleResolvers = settleResolvers.filter((entry) => entry !== waiter);
        resolve(event);
      };
      const waiter = (event: SettleEvent): void => finish(event);
      const onAbort = (): void => finish({ kind: 'pending' });
      const timer = setTimeout(
        () => finish({ kind: 'pending' }),
        waitSeconds * 1000,
      );
      settleResolvers.push(waiter);
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
      const instance = server;
      server = null;
      await new Promise<void>((resolve) => {
        if (typeof instance.closeAllConnections === 'function')
          instance.closeAllConnections();
        instance.close(() => resolve());
      });
    }
    if (options.onClose)
      try {
        await options.onClose();
      } catch {
        // best-effort cleanup
      }
  }

  function resetTimer(): void {
    if (closed) return;
    if (shutdownTimer) clearTimeout(shutdownTimer);
    shutdownTimer = setTimeout(() => {
      // An active waiter means the tool is still long-polling for a save —
      // extend rather than closing the form out from under the user.
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
    planSave: options.planSave,
    persistSave: options.persistSave,
    settleSaved: (summary) => settle({ kind: 'saved', summary }),
    closeServer,
    resetTimer,
  });

  server = createServer(handler);
  const listening = server;

  const { url, port } = await new Promise<{ url: string; port: number }>(
    (resolve, reject) => {
      listening.listen(0, LOOPBACK_HOST, () => {
        const address = listening.address();
        if (address && typeof address === 'object')
          resolve({
            url: `http://${LOOPBACK_HOST}:${address.port}${Route.ROOT}?token=${token}`,
            port: address.port,
          });
        else reject(new Error('Failed to get server address'));
      });
      listening.on('error', (err) => {
        if (!serverStarted) {
          reject(err);
          return;
        }
        // Post-startup failure: reject() is a no-op by now, so tear down.
        console.error(`${INJECTION_PREFIX} settings web server error:`, err);
        void closeServer();
      });
    },
  );

  serverStarted = true;
  resetTimer();

  return { url, token, port, awaitSettled, close: closeServer };
}
