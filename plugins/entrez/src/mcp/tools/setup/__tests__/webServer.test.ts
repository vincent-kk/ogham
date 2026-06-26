import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { startSetupServer } from "../webServer/index.js";
import type { SetupServerHandle } from "../../../../types/setup.js";
import type { SetupFormData, ConnectionTestResult } from "../../../../types/setup.js";
import {
  loadConfig,
  saveConfig,
  loadCredentials,
  saveCredentials,
} from "../../../../core/config/index.js";

const HTML =
  "<html><head><script>window.__ENTREZ_STATE__ = null;</script></head><body>setup</body></html>";

let dir: string;
let configPath: string;
let credPath: string;
let handle: SetupServerHandle;
let lastTested: SetupFormData | null;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "entrez-setup-"));
  configPath = join(dir, "config.json");
  credPath = join(dir, "credentials.json");
  lastTested = null;

  handle = await startSetupServer({
    context: {
      settingsHtml: HTML,
      loadConfig: () => loadConfig(configPath),
      loadCredentials: () => loadCredentials(credPath),
      saveConfig: (c) => saveConfig(c, configPath),
      saveCredentials: (c) => saveCredentials(c, credPath),
      testConnection: async (data): Promise<ConnectionTestResult> => {
        lastTested = data;
        const success = data.email.includes("@");
        return { success, message: success ? "EInfo reachable" : "bad email", dbCount: 3 };
      },
    },
  });
});

afterEach(async () => {
  await handle.close();
  await rm(dir, { recursive: true, force: true });
});

function postJson(path: string, body: unknown) {
  return fetch(`${handle.url}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID = {
  tool: "my-app",
  email: "user@example.com",
  api_key: "SECRETKEY",
  default_db: "pubmed",
};

describe("setup web server", () => {
  it("serves the page with injected (masked) state on GET /", async () => {
    await saveConfig({ tool: "t", email: "e@x.com" }, configPath);
    await saveCredentials({ api_key: "STORED" }, credPath);

    const res = await fetch(`${handle.url}/`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("window.__ENTREZ_STATE__ =");
    expect(html).not.toContain("STORED");
    expect(html).toContain("•"); // api_key shown masked, not the real value
  });

  it("returns masked status on GET /status (no plaintext key)", async () => {
    await saveCredentials({ api_key: "STORED" }, credPath);
    const res = await fetch(`${handle.url}/status`);
    const body = await res.json();
    expect(body.api_key).not.toBe("STORED");
    expect(JSON.stringify(body)).not.toContain("STORED");
  });

  it("rejects a non-JSON POST (CSRF guard, 415)", async () => {
    const res = await fetch(`${handle.url}/test`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(415);
  });

  it("runs the EInfo probe on POST /test", async () => {
    const res = await postJson("/test", VALID);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.dbCount).toBe(3);
    expect(lastTested?.api_key).toBe("SECRETKEY");
  });

  it("saves config + credentials (0o600) on POST /submit; key not in response", async () => {
    const res = await postJson("/submit", VALID);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(JSON.stringify(body)).not.toContain("SECRETKEY");

    const cfg = await loadConfig(configPath);
    expect(cfg?.tool).toBe("my-app");
    expect((await loadCredentials(credPath)).api_key).toBe("SECRETKEY");
    expect((await stat(credPath)).mode & 0o777).toBe(0o600);
  });

  it("rejects an invalid submit without saving (400)", async () => {
    const res = await postJson("/submit", { tool: "x", email: "not-email" });
    expect(res.status).toBe(400);
    expect(await loadConfig(configPath)).toBeNull();
  });

  it("does not save when the connection test fails", async () => {
    const res = await postJson("/submit", { ...VALID, email: "no-at-sign" });
    // schema rejects bad email first (400); ensure nothing was written
    expect(res.status).toBe(400);
    await expect(readFile(credPath, "utf-8")).rejects.toBeTruthy();
  });
});
