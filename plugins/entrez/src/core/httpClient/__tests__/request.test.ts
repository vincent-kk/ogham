import { describe, it, expect } from "vitest";

import { httpRequest } from "../operations/request.js";
import type { HttpDeps } from "../../../types/http.js";

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";

function baseDeps(
  fetchImpl: typeof fetch,
  overrides: Partial<HttpDeps> = {},
): HttpDeps {
  return {
    tool: "entrez-test",
    email: "user@example.com",
    allowedHosts: ["eutils.ncbi.nlm.nih.gov"],
    fetchImpl,
    sleep: async () => {},
    allowPrivateIp: true,
    ...overrides,
  };
}

function ok(body = "<ok/>"): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "application/xml" },
  });
}

describe("httpRequest — injection & method", () => {
  it("injects tool/email/api_key and forwards retmax", async () => {
    let url = "";
    const fetchImpl = (async (u: string | URL) => {
      url = String(u);
      return ok();
    }) as unknown as typeof fetch;

    const res = await httpRequest(
      { url: EUTILS, params: { db: "pubmed", term: "cancer", retmax: 0 } },
      baseDeps(fetchImpl, { apiKey: "SECRET" }),
    );

    const q = new URL(url).searchParams;
    expect(res.ok).toBe(true);
    expect(q.get("tool")).toBe("entrez-test");
    expect(q.get("email")).toBe("user@example.com");
    expect(q.get("api_key")).toBe("SECRET");
    expect(q.get("retmax")).toBe("0");
    expect(res.apiKeyUsed).toBe(true);
  });

  it("uses GET at 200 ids and POST at 201 ids (auto-POST)", async () => {
    let method = "";
    let body: string | undefined;
    let urlStr = "";
    const fetchImpl = (async (u: string | URL, init?: RequestInit) => {
      method = init?.method ?? "GET";
      body = init?.body as string | undefined;
      urlStr = String(u);
      return ok();
    }) as unknown as typeof fetch;

    const get200 = Array.from({ length: 200 }, (_, i) => i + 1).join(",");
    await httpRequest({ url: EUTILS, params: { id: get200 } }, baseDeps(fetchImpl));
    expect(method).toBe("GET");

    const post201 = Array.from({ length: 201 }, (_, i) => i + 1).join(",");
    await httpRequest({ url: EUTILS, params: { id: post201 } }, baseDeps(fetchImpl));
    expect(method).toBe("POST");
    expect(urlStr).not.toContain("?");
    expect(new URLSearchParams(body).get("id")?.split(",").length).toBe(201);
    expect(new URLSearchParams(body).get("tool")).toBe("entrez-test");
  });
});

describe("httpRequest — retry & rate limiting", () => {
  it("retries a 429 then succeeds", async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n += 1;
      return n < 3 ? new Response("", { status: 429 }) : ok();
    }) as unknown as typeof fetch;

    const res = await httpRequest({ url: EUTILS }, baseDeps(fetchImpl));
    expect(res.ok).toBe(true);
    expect(n).toBe(3);
  });

  it("gives up after rateRetryMax 429s (RATE_LIMITED)", async () => {
    const fetchImpl = (async () =>
      new Response("", { status: 429 })) as unknown as typeof fetch;
    const res = await httpRequest(
      { url: EUTILS },
      baseDeps(fetchImpl, { rateRetryMax: 2 }),
    );
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("RATE_LIMITED");
  });

  it("retries a 503 then succeeds", async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n += 1;
      return n < 2 ? new Response("", { status: 503 }) : ok();
    }) as unknown as typeof fetch;
    const res = await httpRequest({ url: EUTILS }, baseDeps(fetchImpl));
    expect(res.ok).toBe(true);
  });

  it("retries a network error then succeeds", async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n += 1;
      if (n < 2) throw new Error("boom");
      return ok();
    }) as unknown as typeof fetch;
    const res = await httpRequest({ url: EUTILS }, baseDeps(fetchImpl));
    expect(res.ok).toBe(true);
  });

  it("returns a fatal non-retryable 400 (INVALID_QUERY)", async () => {
    const fetchImpl = (async () =>
      new Response("bad", { status: 400 })) as unknown as typeof fetch;
    const res = await httpRequest({ url: EUTILS }, baseDeps(fetchImpl));
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("INVALID_QUERY");
  });

  it("blocks a host outside the allowlist (SSRF)", async () => {
    const fetchImpl = (async () => ok()) as unknown as typeof fetch;
    await expect(
      httpRequest(
        { url: "https://evil.example.com/x" },
        baseDeps(fetchImpl),
      ),
    ).rejects.toThrow(/SSRF/);
  });
});
