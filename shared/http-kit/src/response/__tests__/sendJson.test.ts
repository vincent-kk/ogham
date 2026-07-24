import type { ServerResponse } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { sendJson } from "../sendJson.js";

function mockResponse() {
  const writeHead = vi.fn();
  const end = vi.fn();
  const res = { writeHead, end } as unknown as ServerResponse;
  return { res, writeHead, end };
}

describe("sendJson", () => {
  it("writes the given status code", () => {
    const { res, writeHead } = mockResponse();
    sendJson(res, 201, { ok: true });
    expect(writeHead).toHaveBeenCalledWith(201, expect.any(Object));
  });

  it("declares JSON with an explicit utf-8 charset", () => {
    const { res, writeHead } = mockResponse();
    sendJson(res, 200, { ok: true });
    expect(writeHead.mock.calls[0][1]["Content-Type"]).toBe(
      "application/json; charset=utf-8",
    );
  });

  it("sends the byte length, not the character length", () => {
    const { res, writeHead } = mockResponse();
    const body = { msg: "한글" };
    sendJson(res, 200, body);
    const expected = Buffer.byteLength(JSON.stringify(body));
    expect(writeHead.mock.calls[0][1]["Content-Length"]).toBe(expected);
  });

  it("sends null rather than throwing for an unserializable body", () => {
    const { res, writeHead, end } = mockResponse();
    sendJson(res, 500, undefined);
    expect(writeHead).toHaveBeenCalledWith(500, expect.any(Object));
    expect(end).toHaveBeenCalledWith("null");
  });

  it("ends the response with the serialized body", () => {
    const { res, end } = mockResponse();
    const body = { a: 1, b: "x" };
    sendJson(res, 200, body);
    expect(end).toHaveBeenCalledWith(JSON.stringify(body));
  });
});
