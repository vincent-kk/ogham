import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";

import { describe, expect, it } from "vitest";

import {
  MAX_BODY_BYTES,
  RequestTooLargeError,
  parseBody,
} from "../parseBody.js";

function mockRequest(
  chunks: Buffer[],
  headers: Record<string, string> = {},
): IncomingMessage {
  const req = Readable.from(chunks) as unknown as IncomingMessage;
  req.headers = headers;
  return req;
}

describe("parseBody", () => {
  it("parses a JSON object body", async () => {
    const req = mockRequest([Buffer.from('{"a":1,"b":"x"}')]);
    await expect(parseBody(req)).resolves.toEqual({ a: 1, b: "x" });
  });

  it("resolves an empty body to {}", async () => {
    const req = mockRequest([]);
    await expect(parseBody(req)).resolves.toEqual({});
  });

  it("rejects when the Content-Length header exceeds the cap", async () => {
    const req = mockRequest([Buffer.from("x")], { "content-length": "20" });
    await expect(parseBody(req, 10)).rejects.toBeInstanceOf(
      RequestTooLargeError,
    );
  });

  it("rejects when the received bytes exceed the cap", async () => {
    const req = mockRequest([Buffer.alloc(20, 0x61)]);
    await expect(parseBody(req, 10)).rejects.toBeInstanceOf(
      RequestTooLargeError,
    );
  });

  it("drains an overflowing body to the end instead of aborting mid-stream", async () => {
    const req = mockRequest([Buffer.alloc(20, 0x61), Buffer.alloc(20, 0x62)]);
    let ended = false;
    req.on("end", () => {
      ended = true;
    });
    await expect(parseBody(req, 10)).rejects.toBeInstanceOf(
      RequestTooLargeError,
    );
    // Aborting here would kill the connection before the caller's 413 —
    // see parseBodyServer.test.ts for the delivered-status proof.
    expect(ended).toBe(true);
  });

  it("rejects invalid JSON with a parse error, not a size error", async () => {
    const req = mockRequest([Buffer.from("{not json")]);
    await expect(parseBody(req)).rejects.toThrow(SyntaxError);
  });

  it("honours a caller-supplied maxBytes under the default", async () => {
    const req = mockRequest([Buffer.from('{"ok":true}')]);
    await expect(parseBody(req, 4)).rejects.toBeInstanceOf(
      RequestTooLargeError,
    );
  });

  it("exposes the default cap as 1 MB", () => {
    expect(MAX_BODY_BYTES).toBe(1_000_000);
  });
});
