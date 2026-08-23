import { createServer } from "node:http";
import type { Server } from "node:http";

import { generateToken } from "@ogham/http-kit";

import type {
  SetupCompletion,
  SetupServerHandle,
} from "../../../../types/index.js";
import { createRouteHandler } from "./routing/routes.js";
import type { RouteContext } from "./routing/routeContext.js";

const AUTO_SHUTDOWN_MS = 5 * 60 * 1000; // 5 minutes

export interface SetupServerOptions {
  context: Omit<
    RouteContext,
    "resetTimer" | "closeServer" | "completeSetup" | "token"
  >;
}

/** Start a local HTTP server for setup UI. The handle owns URL, close, and completion state. */
export async function startSetupServer(
  options: SetupServerOptions,
): Promise<SetupServerHandle> {
  let server: Server | null = null;
  let shutdownTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  let completionSettled = false;
  let settleCompletion!: (result: SetupCompletion) => void;
  const completion = new Promise<SetupCompletion>((resolve) => {
    settleCompletion = resolve;
  });

  function finish(result: SetupCompletion): void {
    if (completionSettled) return;
    completionSettled = true;
    settleCompletion(result);
  }

  function completeSetup(configPath: string): void {
    finish({
      success: true,
      message: "Configuration saved successfully",
      config_path: configPath,
    });
  }

  async function closeServer(
    failureMessage = "Setup closed before configuration was saved",
  ): Promise<void> {
    if (closed) return;
    closed = true;
    finish({ success: false, message: failureMessage });
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
      void closeServer("Setup timed out before configuration was saved");
    }, AUTO_SHUTDOWN_MS);
  }

  const token = generateToken();
  const routeContext: RouteContext = {
    ...options.context,
    token,
    resetTimer,
    closeServer,
    completeSetup,
  };

  const handler = createRouteHandler(routeContext);
  server = createServer(handler);

  const url = await new Promise<string>((resolve, reject) => {
    server!.listen(0, "127.0.0.1", () => {
      const addr = server!.address();
      if (addr && typeof addr === "object")
        resolve(`http://127.0.0.1:${addr.port}/?token=${token}`);
      else reject(new Error("Failed to get server address"));
    });
    server!.on("error", reject);
  });

  server.on("error", (error) => {
    const message =
      error instanceof Error ? error.message : "Setup server failed";
    void closeServer(message);
  });

  resetTimer();

  return { url, token, close: closeServer, completion };
}
