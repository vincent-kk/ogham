import { type Server, createServer } from "node:http";

import { generateToken } from "../../core/authToken/index.js";
import { loadConfig, saveConfig } from "../../core/configManager/index.js";
import { getProjectHash } from "../../core/projectHash/index.js";
import { logger } from "../../lib/logger.js";

import { createRouteHandler } from "./routing/routes.js";
import { loadViewerHtml } from "./utils/loadViewerHtml.js";
import { loadSettingsHtml } from "./utils/loadSettingsHtml.js";
import { resolveAssetPath } from "./utils/resolveAssetPath.js";
import { clearSessionImageSources } from "./utils/sessionImageSources.js";

export interface HttpServerInstance {
  baseUrl: string;
  port: number;
  token: string;
  viewerUrl: (sessionId: string) => string;
  settingsUrl: () => string;
  touch: () => void;
  close: () => Promise<void>;
}

const MINUTE_MS = 60 * 1000;

let instance: HttpServerInstance | null = null;
let starting: Promise<HttpServerInstance> | null = null;

/** Start the singleton server, or reuse + touch the running one. */
export async function ensureHttpServer(): Promise<HttpServerInstance> {
  if (instance) {
    instance.touch();
    return instance;
  }
  if (starting) return starting;
  starting = startHttpServer();
  try {
    instance = await starting;
    return instance;
  } finally {
    starting = null;
  }
}

/** The running server, or null when none is up. */
export function getHttpServer(): HttpServerInstance | null {
  return instance;
}

async function startHttpServer(): Promise<HttpServerInstance> {
  const config = await loadConfig();
  const token = generateToken();
  const projectHash = getProjectHash(process.cwd());
  const idleMs = config.idle_shutdown_minutes * MINUTE_MS;

  let server: Server | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    instance = null;
    clearSessionImageSources();
    if (server) {
      const activeServer = server;
      server = null;
      await new Promise<void>((resolve) => {
        if (typeof activeServer.closeAllConnections === "function")
          activeServer.closeAllConnections();

        activeServer.close(() => resolve());
      });
    }
    logger.info("http server closed");
  };

  const touch = (): void => {
    if (closed) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      void close();
    }, idleMs);
    idleTimer.unref();
  };

  const handler = createRouteHandler({
    token,
    projectHash,
    loadViewerHtml,
    loadSettingsHtml,
    loadConfig,
    saveConfig,
    resolveAssetPath,
    touch,
  });

  server = createServer(handler);
  const port = await new Promise<number>((resolve, reject) => {
    const onListenError = (error: Error): void => reject(error);
    server!.once("error", onListenError);
    server!.listen(config.preferred_port, "127.0.0.1", () => {
      server!.removeListener("error", onListenError);
      const address = server!.address();
      if (address && typeof address === "object") resolve(address.port);
      else reject(new Error("failed to read server address"));
    });
  });
  server.on("error", (error) => {
    logger.error("http server error", { error: error.message });
  });

  touch();
  const baseUrl = `http://127.0.0.1:${port}`;
  logger.info("http server started", { port });
  return {
    baseUrl,
    port,
    token,
    viewerUrl: (sessionId) => `${baseUrl}/r/${sessionId}?token=${token}`,
    settingsUrl: () => `${baseUrl}/settings?token=${token}`,
    touch,
    close,
  };
}
