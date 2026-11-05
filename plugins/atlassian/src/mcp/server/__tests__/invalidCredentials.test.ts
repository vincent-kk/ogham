import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createServer } from "../server.js";

/** Per-case storage path and downstream calls observed at the MCP boundary. */
const mocks = vi.hoisted(() => ({
  path: "",
  configured: true,
  multipleSites: false,
  registerTool: vi.fn(),
  fetch: vi.fn(),
  comment: vi.fn(),
  testConnection: vi.fn(),
}));
vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    registerTool = mocks.registerTool;
  },
}));
vi.mock("../../../constants/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../constants/index.js")>()),
  get CREDENTIALS_PATH() {
    return mocks.path;
  },
}));
vi.mock("../../../core/configManager/index.js", () => ({
  loadConfig: async () =>
    mocks.configured
      ? {
          jira: [
            {
              base_url: "https://test.atlassian.net",
              username: "user@example.test",
              is_cloud: true,
            },
            ...(mocks.multipleSites
              ? [{ base_url: "https://two.atlassian.net", is_cloud: true }]
              : []),
          ],
        }
      : {},
}));
vi.mock("../../../core/index.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../core/index.js")>()),
  testConnection: mocks.testConnection,
}));
vi.mock("../../tools/fetch/index.js", () => ({ handleFetch: mocks.fetch }));
vi.mock("../../tools/commentThread/index.js", () => ({
  handleCommentThread: mocks.comment,
}));

/** Directory containing only this case's stored file. */
let directory: string;
beforeEach(async () => {
  vi.clearAllMocks();
  directory = await mkdtemp(join(tmpdir(), "atlassian-api-invalid-"));
  mocks.path = join(directory, "credentials.json");
  mocks.configured = true;
  mocks.multipleSites = false;
  await writeFile(
    mocks.path,
    JSON.stringify({
      jira: { basic: { api_token: "do-not-leak" }, bearer: { token: 123 } },
    }),
  );
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

it.each([
  [
    "fetch",
    { service: "jira", method: "GET", endpoint: "/issue/TEST-1" },
    true,
  ],
  ["comment_thread", { mode: "read", issue_key: "TEST-1" }, true],
  ["auth_check", {}, true],
  ["auth_check", { connection_test: true }, true],
  [
    "fetch",
    { service: "jira", method: "GET", endpoint: "/issue/TEST-1" },
    false,
  ],
  ["comment_thread", { mode: "read", issue_key: "TEST-1" }, false],
  ["auth_check", {}, false],
  [
    "fetch",
    { service: "jira", method: "GET", endpoint: "/issue/TEST-1" },
    true,
    true,
  ],
  ["comment_thread", { mode: "read", issue_key: "TEST-1" }, true, true],
  [
    "fetch",
    {
      service: "jira",
      method: "GET",
      endpoint: "/issue/TEST-1",
      base_url: "https://unregistered.atlassian.net",
    },
    true,
    true,
  ],
  [
    "comment_thread",
    {
      mode: "read",
      issue_key: "TEST-1",
      base_url: "https://unregistered.atlassian.net",
    },
    true,
    true,
  ],
])(
  "rejects %s (%j) with invalid storage before downstream work (configured=%s, multipleSites=%s)",
  async (name, args, configured, multipleSites = false) => {
    mocks.configured = Boolean(configured);
    mocks.multipleSites = Boolean(multipleSites);
    createServer();
    const registration = mocks.registerTool.mock.calls.find(
      ([tool]) => tool === name,
    );
    expect(registration).toBeDefined();
    const result = await registration![2](args);
    expect(result).toMatchObject({
      isError: true,
      content: [
        {
          type: "text",
          text: "Error: Stored credentials are invalid. Run setup again.",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("do-not-leak");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.comment).not.toHaveBeenCalled();
    expect(mocks.testConnection).not.toHaveBeenCalled();
  },
);

it.each([
  ["fetch", "valid", undefined],
  ["comment_thread", "valid", undefined],
  ["fetch", "missing", undefined],
  ["comment_thread", "missing", undefined],
  ["fetch", "valid", "https://unregistered.atlassian.net"],
  ["comment_thread", "valid", "https://unregistered.atlassian.net"],
  ["fetch", "missing", "https://unregistered.atlassian.net"],
  ["comment_thread", "missing", "https://unregistered.atlassian.net"],
])(
  "preserves %s site-selection errors with %s credentials and selector %s",
  async (name, storage, baseUrl) => {
    mocks.multipleSites = true;
    if (storage === "missing") await rm(mocks.path);
    else
      await writeFile(
        mocks.path,
        JSON.stringify({ jira: { bearer: { token: "valid-test-token" } } }),
      );

    createServer();
    const registration = mocks.registerTool.mock.calls.find(
      ([tool]) => tool === name,
    );
    expect(registration).toBeDefined();
    const args =
      name === "fetch"
        ? { service: "jira", method: "GET", endpoint: "/issue/TEST-1" }
        : { mode: "read", issue_key: "TEST-1" };
    const result = await registration![2]({ ...args, base_url: baseUrl });
    expect(result).toMatchObject({
      isError: true,
      content: [
        {
          type: "text",
          text: baseUrl
            ? 'Error: jira site not found for base_url "https://unregistered.atlassian.net". Registered: https://test.atlassian.net, https://two.atlassian.net'
            : "Error: Multiple jira sites configured. Specify base_url to select one: https://test.atlassian.net, https://two.atlassian.net",
        },
      ],
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.comment).not.toHaveBeenCalled();
    expect(mocks.testConnection).not.toHaveBeenCalled();
  },
);
