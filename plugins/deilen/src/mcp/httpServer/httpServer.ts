import { type Server, createServer } from "node:http";

import { REAP_GRACE_MS } from "../../constants/defaults.js";
import { generateToken } from "../../core/authToken/index.js";
import { loadConfig, saveConfig } from "../../core/configManager/index.js";
import { getProjectHash } from "../../core/projectHash/index.js";
import { logger } from "../../lib/logger.js";

import { createRouteHandler } from "./routing/routes.js";
import { loadViewerHtml } from "./utils/loadViewerHtml.js";
import { loadSettingsHtml } from "./utils/loadSettingsHtml.js";
import { resolveAssetPath } from "./utils/resolveAssetPath.js";

export interface HttpServerInstance {
  baseUrl: string;
  port: number;
  token: string;
  viewerUrl: (sessionId: string) => string;
  settingsUrl: () => string;
  touch: () => void;
  retain: (sessionId: string) => void;
  release: (sessionId: string) => void;
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
  let reapTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;
  const live = new Set<string>();

  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (reapTimer) {
      clearTimeout(reapTimer);
      reapTimer = null;
    }
    live.clear();
    instance = null;
    if (server) {
      const s = server;
      server = null;
      await new Promise<void>((resolve) => {
        if (typeof s.closeAllConnections === "function") {
          s.closeAllConnections();
        }
        s.close(() => resolve());
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

  // Refcount serving sessions: an explicit close of the last one reaps the
  // shared server after a short grace, so it doesn't wait out the idle window.
  const retain = (sessionId: string): void => {
    if (closed) return;
    live.add(sessionId);
    if (reapTimer) {
      clearTimeout(reapTimer);
      reapTimer = null;
    }
  };

  const release = (sessionId: string): void => {
    if (closed) return;
    live.delete(sessionId);
    if (live.size > 0) return;
    if (reapTimer) clearTimeout(reapTimer);
    reapTimer = setTimeout(() => {
      void close();
    }, REAP_GRACE_MS);
    reapTimer.unref();
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
    release,
  });

  server = createServer(handler);
  const port = await new Promise<number>((resolve, reject) => {
    const onListenError = (err: Error): void => reject(err);
    server!.once("error", onListenError);
    server!.listen(config.preferred_port, "127.0.0.1", () => {
      server!.removeListener("error", onListenError);
      const addr = server!.address();
      if (addr && typeof addr === "object") resolve(addr.port);
      else reject(new Error("failed to read server address"));
    });
  });
  server.on("error", (err) => {
    logger.error("http server error", { error: err.message });
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
    retain,
    release,
    close,
  };
}
