import { request as httpRequest } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import type {
  SetupServerHandle,
  ConnectionTestResult,
} from "../../../../types/setup.js";
import { startSetupServer } from "../webServer/index.js";

let handle: SetupServerHandle | null = null;

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = null;
  }
});

async function start(): Promise<SetupServerHandle> {
  handle = await startSetupServer({
    context: {
      settingsHtml: "<html>__ENTREZ_STATE__</html>",
      loadConfig: async () => null,
      loadCredentials: async () => ({}),
      saveConfig: async () => {},
      saveCredentials: async () => {},
      testConnection: async (): Promise<ConnectionTestResult> => ({
        success: true,
        message: "ok",
        dbCount: 1,
      }),
    },
  });
  return handle;
}

// node:http (not fetch) — fetch strips forbidden headers like Host/Origin.
function rawRequest(opts: {
  port: number;
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        host: "127.0.0.1",
        port: opts.port,
        path: opts.path,
        method: opts.method ?? "GET",
        headers: opts.headers ?? {},
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data }),
        );
      },
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

const VALID = JSON.stringify({
  email: "user@example.com",
  api_key: "SECRETKEY",
  default_db: "pubmed",
});

describe("setup server guard", () => {
  // --- basic ---

  it("rejects a forged non-loopback Host with 403 (DNS rebinding)", async () => {
    const port = new URL((await start()).url).port;
    const res = await rawRequest({
      port: Number(port),
      path: `/status?token=${handle!.token}`,
      headers: { host: "evil.example.com" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects a request with no token (401)", async () => {
    const port = new URL((await start()).url).port;
    const res = await rawRequest({ port: Number(port), path: "/status" });
    expect(res.status).toBe(401);
  });

  it("rejects a request with a wrong token (401)", async () => {
    const port = new URL((await start()).url).port;
    const res = await rawRequest({
      port: Number(port),
      path: "/status?token=wrong",
    });
    expect(res.status).toBe(401);
  });

  // --- complex ---

  it("rejects a cross-origin POST /test with 403 Invalid origin", async () => {
    const port = new URL((await start()).url).port;
    const res = await rawRequest({
      port: Number(port),
      path: `/test?token=${handle!.token}`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example.com",
      },
      body: VALID,
    });
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body).message).toBe("Invalid origin");
  });

  it("allows a same-origin loopback POST /test with a valid token", async () => {
    const h = await start();
    const port = new URL(h.url).port;
    const res = await rawRequest({
      port: Number(port),
      path: `/test?token=${h.token}`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: `http://127.0.0.1:${port}`,
      },
      body: VALID,
    });
    expect(res.status).toBe(200);
  });
});
