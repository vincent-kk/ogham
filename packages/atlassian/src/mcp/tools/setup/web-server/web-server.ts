import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { SetupServerHandle } from '../../../../types/index.js';
import { createRouteHandler } from './routes.js';
import type { RouteContext } from './routes.js';

const AUTO_SHUTDOWN_MS = 5 * 60 * 1000; // 5 minutes

export interface SetupServerOptions {
  mode?: 'new' | 'edit';
  context: Omit<RouteContext, 'resetTimer' | 'closeServer'>;
}

/** Start a local HTTP server for setup UI. Returns { url, close } — no module-level state. */
export async function startSetupServer(options: SetupServerOptions): Promise<SetupServerHandle> {
  let server: Server | null = null;
  let shutdownTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

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
  }

  function resetTimer(): void {
    if (closed) return;
    if (shutdownTimer) clearTimeout(shutdownTimer);
    shutdownTimer = setTimeout(() => {
      void closeServer();
    }, AUTO_SHUTDOWN_MS);
  }

  const routeContext: RouteContext = {
    ...options.context,
    resetTimer,
    closeServer,
  };

  const handler = createRouteHandler(routeContext);
  server = createServer(handler);

  const url = await new Promise<string>((resolve, reject) => {
    server!.listen(0, '127.0.0.1', () => {
      const addr = server!.address();
      if (addr && typeof addr === 'object') {
        resolve(`http://127.0.0.1:${addr.port}`);
      } else {
        reject(new Error('Failed to get server address'));
      }
    });
    server!.on('error', reject);
  });

  resetTimer();

  return { url, close: closeServer };
}
