import { type Server, createServer } from "node:http";

import { generateToken } from "../../core/authToken/generateToken.js";
import { loadConfig } from "../../core/configManager/loadConfig.js";
import { saveConfig } from "../../core/configManager/saveConfig.js";
import { getProjectHash } from "../../core/projectHash/getProjectHash.js";
import { logger } from "../../lib/logger.js";

import { createRouteHandler } from "./routing/routes.js";
import { loadReportHtml } from "./utils/loadReportHtml.js";
import { loadSettingsHtml } from "./utils/loadSettingsHtml.js";
import { resolveAssetPath } from "./utils/resolveAssetPath.js";

export interface HttpServerInstance {
  baseUrl: string;
  port: number;
  token: string;
  reportUrl: (sessionId: string) => string;
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

  const handler = createRouteHandler({
    token,
    projectHash,
    loadReportHtml,
    loadSettingsHtml,
    loadConfig,
    saveConfig,
    resolveAssetPath,
    touch,
    closeServer: close,
  });

  server = createServer(handler);
  const port = await new Promise<number>((resolve, reject) => {
    server!.on("error", reject);
    server!.listen(config.preferred_port, "127.0.0.1", () => {
      const addr = server!.address();
      if (addr && typeof addr === "object") resolve(addr.port);
      else reject(new Error("failed to read server address"));
    });
  });

  touch();
  const baseUrl = `http://127.0.0.1:${port}`;
  logger.info("http server started", { port });
  return {
    baseUrl,
    port,
    token,
    reportUrl: (sessionId) => `${baseUrl}/r/${sessionId}?token=${token}`,
    settingsUrl: () => `${baseUrl}/settings?token=${token}`,
    touch,
    close,
  };
}
