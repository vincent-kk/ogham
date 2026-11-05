import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildFetchContext } from "../buildFetchContext.js";
import { loadConfig } from "../../../../core/configManager/index.js";
import { getAuthHeader } from "../../../../core/authManager/index.js";

vi.mock("../../../../core/configManager/index.js", () => ({
  loadConfig: vi.fn(),
}));
vi.mock("../../../../core/authManager/index.js", () => ({
  getAuthHeader: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(loadConfig).mockResolvedValue({
    jira: [
      {
        base_url: "https://team.atlassian.net",
        is_cloud: true,
        ssl_verify: true,
        timeout: 30000,
      },
    ],
  });
});

describe("buildFetchContext credential containment", () => {
  it.each(["Basic dXNlcjpzZWNyZXQ=", "Bearer secret-token"])(
    "keeps %s available for HTTP while omitting it from serialization and copies",
    async (header) => {
      vi.mocked(getAuthHeader).mockResolvedValue(header);
      const context = await buildFetchContext("jira");
      expect(context?.http.auth_header).toBe(header);
      expect(JSON.stringify(context)).not.toContain(header);
      expect(JSON.stringify(context?.http)).not.toContain(header);
      expect({ ...context?.http }).not.toHaveProperty("auth_header");
      expect(JSON.parse(JSON.stringify(context))).toMatchObject({
        service: "jira",
        apiVersion: "3",
        is_cloud: true,
        http: {
          base_url: "https://team.atlassian.net",
          ssl_verify: true,
          timeout: 30000,
          allow_private_ip: false,
        },
      });
    },
  );

  it("preserves absent credentials without manufacturing a header", async () => {
    vi.mocked(getAuthHeader).mockResolvedValue(null);
    const context = await buildFetchContext("jira");
    expect(context?.http.auth_header).toBeUndefined();
    expect(JSON.parse(JSON.stringify(context)).http).not.toHaveProperty(
      "auth_header",
    );
  });

  it("returns null when the requested service has no configured sites", async () => {
    expect(await buildFetchContext("confluence")).toBeNull();
  });
});
