import { createServer } from "node:http";
import type { Server } from "node:http";

import type { SetupServerHandle } from "../../../../types/setup.js";
import { SETUP_AUTO_SHUTDOWN_MS } from "../../../../constants/defaults.js";
import { createRouteHandler } from "./routes.js";
import type { RouteContext } from "./routeContext.js";

export interface SetupServerOptions {
  context: Omit<RouteContext, "resetTimer" | "closeServer">;
}

/**
 * Start a local setup server on 127.0.0.1 (random port). Returns
 * { url, close } — no module-level state. Auto-shuts down after inactivity.
 */
export async function startSetupServer(
  options: SetupServerOptions,
): Promise<SetupServerHandle> {
  let server: Server | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  async function closeServer(): Promise<void> {
    if (closed) return;
    closed = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (server) {
      const s = server;
      server = null;
      await new Promise<void>((resolve) => s.close(() => resolve()));
    }
  }

  function resetTimer(): void {
    if (closed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void closeServer(), SETUP_AUTO_SHUTDOWN_MS);
  }

  const routeContext: RouteContext = {
    ...options.context,
    resetTimer,
    closeServer,
  };
  server = createServer(createRouteHandler(routeContext));

  const url = await new Promise<string>((resolve, reject) => {
    server!.listen(0, "127.0.0.1", () => {
      const addr = server!.address();
      if (addr && typeof addr === "object")
        resolve(`http://127.0.0.1:${addr.port}`);
      else reject(new Error("Failed to get server address"));
    });
    server!.on("error", reject);
  });

  resetTimer();
  return { url, close: closeServer };
}
