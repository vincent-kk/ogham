import { describe, expect, it } from "vitest";

import { inspectRequest } from "../inspectRequest.js";

const base = {
  host: "127.0.0.1:8123",
  method: "GET",
} as const;

describe("inspectRequest", () => {
  // --- basic ---

  it("allows a loopback GET with no token requirement", () => {
    expect(inspectRequest({ ...base })).toEqual({ ok: true });
  });

  it("rejects a non-loopback Host with 403 invalid_host (DNS rebinding)", () => {
    const v = inspectRequest({ ...base, host: "evil.example.com" });
    expect(v).toMatchObject({ ok: false, status: 403, code: "invalid_host" });
  });

  it("rejects a wrong token with 401 invalid_token", () => {
    const v = inspectRequest({
      ...base,
      expectedToken: "secret",
      providedToken: "nope",
    });
    expect(v).toMatchObject({ ok: false, status: 401, code: "invalid_token" });
  });

  // --- complex ---

  it("accepts localhost and an explicit port in the Host header", () => {
    expect(inspectRequest({ ...base, host: "localhost" }).ok).toBe(true);
    expect(inspectRequest({ ...base, host: "127.0.0.1:65535" }).ok).toBe(true);
  });

  it("checks Host before token so a rebinding host fails even with a good token", () => {
    const v = inspectRequest({
      host: "attacker.test",
      method: "GET",
      expectedToken: "t",
      providedToken: "t",
    });
    expect(v).toMatchObject({ ok: false, code: "invalid_host" });
  });

  it("skips token verification when expectedToken is undefined", () => {
    expect(inspectRequest({ ...base, providedToken: "anything" }).ok).toBe(
      true,
    );
  });

  it("accepts a matching token via timing-safe comparison", () => {
    const v = inspectRequest({
      ...base,
      expectedToken: "abc123",
      providedToken: "abc123",
    });
    expect(v).toEqual({ ok: true });
  });

  it("rejects a cross-origin POST with 403 invalid_origin", () => {
    const v = inspectRequest({
      host: "127.0.0.1:8123",
      method: "POST",
      origin: "https://evil.example.com",
      contentType: "application/json",
    });
    expect(v).toMatchObject({ ok: false, status: 403, code: "invalid_origin" });
  });

  it("accepts a loopback Origin on POST", () => {
    const v = inspectRequest({
      host: "127.0.0.1:8123",
      method: "POST",
      origin: "http://127.0.0.1:8123",
      contentType: "application/json",
    });
    expect(v).toEqual({ ok: true });
  });

  it("skips the Origin check when the header is absent (non-browser client)", () => {
    const v = inspectRequest({
      host: "127.0.0.1:8123",
      method: "POST",
      contentType: "application/json",
    });
    expect(v).toEqual({ ok: true });
  });

  it("rejects a POST whose Content-Type is not allowed with 415", () => {
    const v = inspectRequest({
      host: "127.0.0.1:8123",
      method: "POST",
      contentType: "text/plain",
    });
    expect(v).toMatchObject({
      ok: false,
      status: 415,
      code: "unsupported_media_type",
    });
  });

  it("honors a custom allowedContentTypes list (multipart for uploads)", () => {
    const v = inspectRequest({
      host: "127.0.0.1:8123",
      method: "POST",
      contentType: "multipart/form-data; boundary=x",
      allowedContentTypes: ["application/json", "multipart/form-data"],
    });
    expect(v).toEqual({ ok: true });
  });

  it("does not apply Origin/Content-Type checks to non-POST methods", () => {
    const v = inspectRequest({
      host: "127.0.0.1:8123",
      method: "GET",
      origin: "https://evil.example.com",
      contentType: "text/plain",
    });
    expect(v).toEqual({ ok: true });
  });
});
