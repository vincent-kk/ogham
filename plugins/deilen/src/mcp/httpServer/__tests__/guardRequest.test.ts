import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, it } from "vitest";

import { guardRequest } from "../routing/guardRequest.js";
import type { RouteContext } from "../routing/routeContext.js";

const TOKEN = "0123456789abcdef0123456789abcdef";

// guardRequest only reads context.token; a minimal stand-in keeps the test focused.
const context = { token: TOKEN } as unknown as RouteContext;

interface RunInput {
  method?: string;
  host?: string;
  origin?: string;
  contentType?: string;
  token?: string;
}

function run(input: RunInput): {
  rejected: boolean;
  status: number;
  body: { ok: boolean; message?: string };
} {
  const captured = { status: 0, body: { ok: true } as { ok: boolean } };
  const response = {
    writeHead: (status: number): ServerResponse => {
      captured.status = status;
      return response;
    },
    end: (text?: string): void => {
      if (text) captured.body = JSON.parse(text);
    },
  } as unknown as ServerResponse;

  const request = {
    headers: {
      host: input.host ?? "127.0.0.1:8080",
      origin: input.origin,
      "content-type": input.contentType,
    },
  } as unknown as IncomingMessage;

  const url = new URL(
    `http://127.0.0.1:8080/api/x?token=${input.token ?? TOKEN}`,
  );
  const rejected = guardRequest(
    context,
    url,
    input.method ?? "GET",
    request,
    response,
  );
  return { rejected, ...captured };
}

describe("guardRequest", () => {
  // --- basic ---

  it("passes a loopback GET carrying the right token", () => {
    expect(run({}).rejected).toBe(false);
  });

  it("rejects a rebinding (non-loopback) Host with 403 and { ok:false }", () => {
    const out = run({ host: "attacker.example.com" });
    expect(out.rejected).toBe(true);
    expect(out.status).toBe(403);
    expect(out.body).toEqual({ ok: false, message: "Invalid host" });
  });

  it("rejects a wrong token with 401", () => {
    const out = run({ token: "wrong" });
    expect(out.rejected).toBe(true);
    expect(out.status).toBe(401);
    expect(out.body.message).toBe("Invalid token");
  });

  // --- complex ---

  it("rejects a cross-origin POST with 403 Invalid origin", () => {
    const out = run({
      method: "POST",
      origin: "https://evil.example.com",
      contentType: "application/json",
    });
    expect(out.status).toBe(403);
    expect(out.body.message).toBe("Invalid origin");
  });

  it("accepts a same-origin loopback POST with JSON", () => {
    const out = run({
      method: "POST",
      origin: "http://127.0.0.1:8080",
      contentType: "application/json",
    });
    expect(out.rejected).toBe(false);
  });

  it("accepts a multipart POST (deilen serves image uploads)", () => {
    const out = run({
      method: "POST",
      contentType: "multipart/form-data; boundary=x",
    });
    expect(out.rejected).toBe(false);
  });

  it("rejects a POST with an unsupported Content-Type (415)", () => {
    const out = run({ method: "POST", contentType: "text/plain" });
    expect(out.status).toBe(415);
  });

  it("allows a POST with no Origin header (non-browser client)", () => {
    const out = run({ method: "POST", contentType: "application/json" });
    expect(out.rejected).toBe(false);
  });
});
