import { describe, it, expect } from "vitest";

import {
  API_KEY_MASK,
  maskApiKey,
  restoreApiKey,
} from "../webServer/utils/maskApiKey.js";
import { escapeJsonForHtml } from "../webServer/utils/escapeJsonForHtml.js";
import { testConnection } from "../utils/testConnection.js";
import { RateLimit } from "../../../../types/enums.js";

describe("maskApiKey / restoreApiKey", () => {
  it("masks a present key and hides an absent one", () => {
    expect(maskApiKey("secret")).toBe(API_KEY_MASK);
    expect(maskApiKey(undefined)).toBeUndefined();
  });

  it("treats the mask as unchanged, empty as cleared, else as new", () => {
    expect(restoreApiKey(API_KEY_MASK, "stored")).toBe("stored");
    expect(restoreApiKey("", "stored")).toBeUndefined();
    expect(restoreApiKey(undefined, "stored")).toBeUndefined();
    expect(restoreApiKey("fresh", "stored")).toBe("fresh");
  });
});

describe("escapeJsonForHtml", () => {
  it("escapes characters that could break out of a <script> tag", () => {
    const out = escapeJsonForHtml({ x: "</script><b>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<b>");
    expect(JSON.parse(out)).toEqual({ x: "</script><b>" });
  });
});

describe("testConnection", () => {
  const fetchOk = (async () =>
    new Response(
      JSON.stringify({ einforesult: { dblist: ["pubmed", "pmc"] } }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    )) as unknown as typeof fetch;

  it("reports success + rate (with key) and db count", async () => {
    const r = await testConnection(
      { tool: "t", email: "e@x.com", api_key: "KEY" },
      { fetchImpl: fetchOk, sleep: async () => {} },
    );
    expect(r.success).toBe(true);
    expect(r.rateLimit).toBe(RateLimit.WITH_KEY);
    expect(r.dbCount).toBe(2);
  });

  it("reports failure when EInfo is unreachable", async () => {
    const fetchBad = (async () =>
      new Response("err", { status: 500 })) as unknown as typeof fetch;
    const r = await testConnection(
      { tool: "t", email: "e@x.com" },
      { fetchImpl: fetchBad, sleep: async () => {} },
    );
    expect(r.success).toBe(false);
  });
});
