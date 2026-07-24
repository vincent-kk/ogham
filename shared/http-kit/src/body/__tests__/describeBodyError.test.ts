import { describe, expect, it } from "vitest";

import { describeBodyError } from "../describeBodyError.js";
import { RequestTooLargeError } from "../parseBody.js";

describe("describeBodyError", () => {
  it("maps an over-cap body to 413", () => {
    expect(describeBodyError(new RequestTooLargeError())).toEqual({
      status: 413,
      message: "Request body too large",
    });
  });

  it("keeps a caller-supplied size message", () => {
    const described = describeBodyError(
      new RequestTooLargeError("payload exceeds max_payload_mb"),
    );
    expect(described.status).toBe(413);
    expect(described.message).toBe("payload exceeds max_payload_mb");
  });

  it("maps a JSON parse failure to 400", () => {
    let thrown: unknown;
    try {
      JSON.parse("{not json");
    } catch (err) {
      thrown = err;
    }
    const described = describeBodyError(thrown);
    expect(described.status).toBe(400);
    expect(described.message).toMatch(/^Invalid JSON body: /);
  });

  it("maps anything else to 500", () => {
    expect(describeBodyError(new Error("socket hang up"))).toEqual({
      status: 500,
      message: "socket hang up",
    });
    expect(describeBodyError("boom")).toEqual({
      status: 500,
      message: "Internal server error",
    });
  });
});
