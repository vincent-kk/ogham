import { describe, it, expect, vi } from "vitest";
import { validateUrl } from "../core/httpClient/operations/ssrfGuard.js";

vi.mock("node:dns/promises", () => ({
  resolve: vi.fn(async (host: string) => {
    if (host === "jira.internal.corp") return ["10.0.0.42"];
    throw new Error("not resolvable");
  }),
}));

describe("validateUrl", () => {
  it("rejects path traversal", async () => {
    await expect(
      validateUrl(
        "https://example.atlassian.net/rest/api/../etc/passwd",
        "example.atlassian.net",
      ),
    ).rejects.toThrow("SSRF: Path traversal");
  });

  it.each([
    "https://example.atlassian.net/rest/%2e%2e/etc/passwd",
    "https://example.atlassian.net/rest/..%2fetc/passwd",
  ])("rejects percent-encoded traversal: %s", async (url) => {
    await expect(validateUrl(url, "example.atlassian.net")).rejects.toThrow(
      "SSRF: Path traversal",
    );
  });

  it("allows filenames containing consecutive dots", async () => {
    await expect(
      validateUrl(
        "https://mycompany.atlassian.net/secure/attachment/10000/report..final.pdf",
        "mycompany.atlassian.net",
      ),
    ).resolves.toBeUndefined();
  });

  it("rejects hostname mismatch", async () => {
    await expect(
      validateUrl("https://evil.com/rest/api/3/issue", "example.atlassian.net"),
    ).rejects.toThrow("SSRF: Hostname");
  });

  it("rejects non-http protocols", async () => {
    await expect(
      validateUrl("ftp://example.atlassian.net/file", "example.atlassian.net"),
    ).rejects.toThrow("SSRF: Invalid protocol");
  });

  it("rejects direct private IP access", async () => {
    await expect(
      validateUrl("https://127.0.0.1/api", "127.0.0.1"),
    ).rejects.toThrow("SSRF: Direct access to private IP");
  });

  it("allows valid public URL with matching hostname", async () => {
    await expect(
      validateUrl(
        "https://mycompany.atlassian.net/rest/api/3/issue/TEST-1",
        "mycompany.atlassian.net",
      ),
    ).resolves.toBeUndefined();
  });

  it("allows private-IP DNS resolution when allowPrivateIp is true (on-prem)", async () => {
    await expect(
      validateUrl(
        "https://jira.internal.corp/rest/api/2/myself",
        "jira.internal.corp",
        true,
      ),
    ).resolves.toBeUndefined();
  });

  it("allows direct private-IP hostname when allowPrivateIp is true (on-prem)", async () => {
    await expect(
      validateUrl("https://10.0.0.42/rest/api/2/myself", "10.0.0.42", true),
    ).resolves.toBeUndefined();
  });
});
