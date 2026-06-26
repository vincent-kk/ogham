import { describe, it, expect } from "vitest";

import { validateUrl } from "../operations/ssrfGuard.js";

const ALLOW = ["eutils.ncbi.nlm.nih.gov"];

describe("validateUrl", () => {
  it("passes an allowed host", async () => {
    await expect(
      validateUrl(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
        ALLOW,
        true,
      ),
    ).resolves.toBeUndefined();
  });

  it("blocks a host outside the allowlist", async () => {
    await expect(
      validateUrl("https://evil.example.com/x", ALLOW),
    ).rejects.toThrow(/SSRF/);
  });

  it("blocks a non-http(s) protocol", async () => {
    await expect(
      validateUrl("ftp://eutils.ncbi.nlm.nih.gov/x", ALLOW),
    ).rejects.toThrow(/protocol/i);
  });

  it("blocks path traversal in the path", async () => {
    await expect(
      validateUrl("https://eutils.ncbi.nlm.nih.gov/a/../b", ALLOW),
    ).rejects.toThrow(/traversal/i);
  });

  it("blocks a direct private IP even when allowlisted", async () => {
    await expect(
      validateUrl("http://127.0.0.1/x", ["127.0.0.1"], false),
    ).rejects.toThrow(/private/i);
  });

  it("allows a query term containing dots (no false traversal)", async () => {
    await expect(
      validateUrl(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?term=a..b",
        ALLOW,
        true,
      ),
    ).resolves.toBeUndefined();
  });

  it("blocks DNS rebinding to a private IP (injected resolver)", async () => {
    await expect(
      validateUrl(
        "https://eutils.ncbi.nlm.nih.gov/x",
        ALLOW,
        false,
        async () => ["10.0.0.5"],
      ),
    ).rejects.toThrow(/private/i);
  });

  it("passes when the host resolves to a public IP", async () => {
    await expect(
      validateUrl(
        "https://eutils.ncbi.nlm.nih.gov/x",
        ALLOW,
        false,
        async () => ["130.14.29.110"],
      ),
    ).resolves.toBeUndefined();
  });

  it("ignores DNS resolution failures (unresolvable host)", async () => {
    await expect(
      validateUrl(
        "https://eutils.ncbi.nlm.nih.gov/x",
        ALLOW,
        false,
        async () => {
          throw new Error("ENOTFOUND");
        },
      ),
    ).resolves.toBeUndefined();
  });
});
