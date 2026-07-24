import { createServer, request as httpRequest } from "node:http";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { RequestTooLargeError, parseBody } from "../parseBody.js";

// Real server + real socket: the stream mocks in parseBody.test.ts cannot
// observe whether a rejection still leaves the caller able to answer.
const CAP_BYTES = 1024;

interface ClientResult {
  status: number | null;
  transportError?: string;
}

let server: Server | undefined;

function startServer(): Promise<number> {
  return new Promise((resolve) => {
    const created = createServer((req, res) => {
      parseBody(req, CAP_BYTES).then(
        () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end('{"ok":true}');
        },
        (err: unknown) => {
          const status = err instanceof RequestTooLargeError ? 413 : 400;
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end('{"ok":false}');
        },
      );
    });
    server = created;
    created.listen(0, "127.0.0.1", () => {
      resolve((created.address() as AddressInfo).port);
    });
  });
}

function post(
  port: number,
  body: Buffer,
  declareLength: boolean,
): Promise<ClientResult> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    // Without Content-Length the client streams chunked, so only the
    // received-bytes tier can catch it.
    if (declareLength) headers["Content-Length"] = String(body.length);
    const req = httpRequest(
      { host: "127.0.0.1", port, method: "POST", path: "/", headers },
      (res) => {
        res.resume();
        resolve({ status: res.statusCode ?? null });
      },
    );
    req.on("error", (err: NodeJS.ErrnoException) => {
      resolve({ status: null, transportError: err.code ?? err.message });
    });
    for (let sent = 0; sent < body.length; sent += 256)
      req.write(body.subarray(sent, sent + 256));
    req.end();
  });
}

afterEach(() => {
  server?.close();
  server = undefined;
});

describe("parseBody over a real socket", () => {
  it("delivers 413 when the received bytes overflow (chunked)", async () => {
    const port = await startServer();
    const result = await post(port, Buffer.alloc(CAP_BYTES * 4, 0x61), false);
    expect(result.transportError).toBeUndefined();
    expect(result.status).toBe(413);
  });

  it("delivers 413 when the declared Content-Length overflows", async () => {
    const port = await startServer();
    const result = await post(port, Buffer.alloc(CAP_BYTES * 4, 0x61), true);
    expect(result.transportError).toBeUndefined();
    expect(result.status).toBe(413);
  });

  it("delivers 200 for a body under the cap", async () => {
    const port = await startServer();
    const result = await post(port, Buffer.from('{"a":1}'), true);
    expect(result.status).toBe(200);
  });

  it("delivers 400 for malformed JSON under the cap", async () => {
    const port = await startServer();
    const result = await post(port, Buffer.from("{not json"), true);
    expect(result.status).toBe(400);
  });
});
