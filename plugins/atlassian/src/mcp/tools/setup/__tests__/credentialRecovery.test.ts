import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SetupServerHandle } from "../../../../types/index.js";
import type { SetupServerOptions } from "../webServer/webServer.js";
import { handleSetup } from "../setup.js";

/** Isolated storage and server lifecycle observed through the real setup wiring. */
const mocks = vi.hoisted(() => ({
  path: "",
  handle: undefined as SetupServerHandle | undefined,
  openBrowser: vi.fn(),
  testConnection: vi
    .fn()
    .mockResolvedValue({ service: "jira", success: true, message: "OK" }),
}));
vi.mock("../../../../constants/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../constants/index.js")>()),
  get CREDENTIALS_PATH() {
    return mocks.path;
  },
}));
vi.mock("@ogham/cross-platform", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ogham/cross-platform")>()),
  openBrowser: mocks.openBrowser,
}));
vi.mock("../utils/loadSettingsHtml.js", () => ({
  loadSettingsHtml: () => '"__SETTINGS_STATE__"',
}));
vi.mock("../../../../core/configManager/index.js", () => {
  const config = {
    jira: [
      {
        base_url: "https://test.atlassian.net",
        username: "user@example.test",
        is_cloud: true,
      },
    ],
  };
  const scope = {
    paths: {
      user: "/tmp/user/config.json",
      project: "/tmp/project/config.json",
    },
    layers: { user: config, project: null },
    effective: config,
    overridden: [],
    warnings: [],
  };
  return {
    loadConfig: async () => config,
    loadConfigByScope: async () => ({ user: config, project: config }),
    loadConfigScope: () => scope,
    saveConfig: async () => scope,
  };
});
vi.mock("../../../../core/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../core/index.js")>()),
  testConnection: mocks.testConnection,
}));
vi.mock("../webServer/index.js", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../webServer/webServer.js")>();
  return {
    startSetupServer: async (options: SetupServerOptions) => {
      mocks.handle = await original.startSetupServer(options);
      return mocks.handle;
    },
  };
});

/** Directory containing only the test credential file. */
let directory: string;
beforeEach(async () => {
  vi.clearAllMocks();
  directory = await mkdtemp(join(tmpdir(), "atlassian-setup-recovery-"));
  mocks.path = join(directory, "credentials.json");
  await writeFile(
    mocks.path,
    JSON.stringify({
      jira: { basic: { api_token: "do-not-prefill" } },
      confluence: { bearer: { token: 123 } },
    }),
  );
});
afterEach(async () => {
  await mocks.handle?.close();
  mocks.handle = undefined;
  await rm(directory, { recursive: true, force: true });
});

it("opens without invalid credential prefill and replaces the file on save", async () => {
  const completion = handleSetup({});
  await vi.waitFor(() => expect(mocks.openBrowser).toHaveBeenCalledOnce());
  const url = new URL(mocks.openBrowser.mock.calls[0][0]);
  const response = await fetch(url);
  expect(response.status).toBe(200);
  const state = await response.json();
  expect(state).toHaveProperty("jira.0.base_url", "https://test.atlassian.net");
  expect(state).not.toHaveProperty("jira.0.api_token");
  expect(state).not.toHaveProperty("configByScope.user.jira.0.api_token");
  expect(state).not.toHaveProperty("configByScope.project.jira.0.api_token");
  expect(JSON.stringify(state)).not.toContain("do-not-prefill");
  expect(JSON.stringify(state)).not.toContain("••••••••••");
  url.pathname = "/submit";
  const saved = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "project",
      deployment_type: "cloud",
      jira: {
        base_url: "https://test.atlassian.net",
        username: "user@example.test",
        api_token: "replacement-token",
      },
    }),
  });
  expect(saved.status).toBe(200);
  expect(JSON.parse(await readFile(mocks.path, "utf8"))).toEqual({
    jira: { basic: { api_token: "replacement-token" } },
    confluence: { basic: { api_token: "replacement-token" } },
  });
  await expect(completion).resolves.toMatchObject({
    success: true,
    config_path: "/tmp/project/config.json",
  });
});
