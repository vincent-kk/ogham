import { describe, it, expect } from "vitest";
import { detectService, stripBaseUrl } from "../utils/index.js";

describe("stripBaseUrl", () => {
  describe("basic", () => {
    it("returns a relative endpoint unchanged", () => {
      expect(
        stripBaseUrl("/secure/attachment/1/a.png", "https://jira.example.com"),
      ).toBe("/secure/attachment/1/a.png");
    });

    it("strips a matching base_url to the remaining path", () => {
      expect(
        stripBaseUrl(
          "https://jira.example.com/secure/attachment/1/a.png",
          "https://jira.example.com",
        ),
      ).toBe("/secure/attachment/1/a.png");
    });

    it("preserves the query string when stripping", () => {
      expect(
        stripBaseUrl(
          "https://jira.example.com/rest/api/2/search?jql=project=DEV",
          "https://jira.example.com",
        ),
      ).toBe("/rest/api/2/search?jql=project=DEV");
    });
  });

  describe("edge", () => {
    it("strips a base_url with context path, keeping the base-relative remainder", () => {
      expect(
        stripBaseUrl(
          "https://host.example.com/jira/secure/attachment/1/a.png",
          "https://host.example.com/jira",
        ),
      ).toBe("/secure/attachment/1/a.png");
    });

    it("ignores trailing slashes on base_url", () => {
      expect(
        stripBaseUrl(
          "https://jira.example.com/rest/api/2/myself",
          "https://jira.example.com/",
        ),
      ).toBe("/rest/api/2/myself");
    });

    it("returns / when the endpoint equals base_url", () => {
      expect(
        stripBaseUrl("https://jira.example.com", "https://jira.example.com/"),
      ).toBe("/");
    });

    it("falls back to pathname+search for same-host endpoints outside the base prefix", () => {
      expect(
        stripBaseUrl(
          "https://host.example.com/secure/attachment/1/a.png?x=1",
          "https://host.example.com/jira",
        ),
      ).toBe("/secure/attachment/1/a.png?x=1");
    });

    it("does not treat a partial path segment as a base match", () => {
      expect(
        stripBaseUrl(
          "https://host.example.com/jirafoo/bar",
          "https://host.example.com/jira",
        ),
      ).toBe("/jirafoo/bar");
    });

    it("throws for endpoints on a different host", () => {
      expect(() =>
        stripBaseUrl(
          "https://host.evil.com/secure/attachment/1/a.png",
          "https://host.example.com",
        ),
      ).toThrow(/does not match the resolved site base_url/);
    });

    it("strips the context path in the same-host fallback (scheme mismatch)", () => {
      expect(
        stripBaseUrl(
          "http://host.example.com/jira/secure/attachment/1/a.png",
          "https://host.example.com/jira",
        ),
      ).toBe("/secure/attachment/1/a.png");
    });

    it("strips the context path in the same-host fallback (explicit default port)", () => {
      expect(
        stripBaseUrl(
          "https://host.example.com:443/jira/secure/attachment/1/a.png?x=1",
          "https://host.example.com/jira",
        ),
      ).toBe("/secure/attachment/1/a.png?x=1");
    });
  });
});

describe("detectService", () => {
  it.each([
    ["/download/attachments/123456/file.pdf", "confluence"],
    [
      "https://conf.example.com/download/attachments/123456/file.pdf",
      "confluence",
    ],
    ["/secure/attachment/10000/image.png", "jira"],
  ] as const)("detects %s as %s", (endpoint, expected) => {
    expect(detectService(endpoint)).toBe(expected);
  });
});
