import { request as httpRequest } from "node:http";

import { describe, it, expect, vi, afterEach } from "vitest";

import type { SetupServerHandle } from "../../../../types/index.js";
import { startSetupServer } from "../webServer/webServer.js";

const mockContext = {
  settingsHtml: "<html>__SETTINGS_STATE__</html>",
  loadConfig: vi.fn().mockResolvedValue({}),
  saveConfig: vi.fn().mockResolvedValue(undefined),
  loadCredentials: vi.fn().mockResolvedValue({}),
  saveCredentials: vi.fn().mockResolvedValue(undefined),
  testConnection: vi
    .fn()
    .mockResolvedValue({ service: "jira", success: true, message: "OK" }),
};

let handle: SetupServerHandle | null = null;

afterEach(async () => {
  if (handle) {
    await handle.close();
    handle = null;
  }
});

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

async function startAndPort(): Promise<{ port: number; token: string }> {
  handle = await startSetupServer({ context: mockContext });
  return { port: Number(new URL(handle.url).port), token: handle.token };
}

describe("setup server guard", () => {
  // --- basic ---

  it("rejects a forged non-loopback Host with 403 (DNS rebinding)", async () => {
    const { port, token } = await startAndPort();
    const res = await rawRequest({
      port,
      path: `/?token=${token}`,
      headers: { host: "evil.example.com" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects a request with no token (401)", async () => {
    const { port } = await startAndPort();
    const res = await rawRequest({ port, path: "/" });
    expect(res.status).toBe(401);
  });

  it("rejects a request with a wrong token (401)", async () => {
    const { port } = await startAndPort();
    const res = await rawRequest({ port, path: "/?token=wrong" });
    expect(res.status).toBe(401);
  });

  // --- complex ---

  it("rejects a cross-origin POST /submit with 403 Invalid origin", async () => {
    const { port, token } = await startAndPort();
    const res = await rawRequest({
      port,
      path: `/submit?token=${token}`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example.com",
      },
      body: "{}",
    });
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body).message).toBe("Invalid origin");
  });

  it("lets a same-origin loopback POST /submit past the origin guard", async () => {
    const { port, token } = await startAndPort();
    const res = await rawRequest({
      port,
      path: `/submit?token=${token}`,
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: `http://127.0.0.1:${port}`,
      },
      body: "{}",
    });
    expect(res.status).not.toBe(403);
  });
});
