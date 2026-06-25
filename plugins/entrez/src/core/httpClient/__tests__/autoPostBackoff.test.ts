import { describe, it, expect } from "vitest";

import { decideMethod } from "../operations/autoPost.js";
import { computeBackoffMs, parseRetryAfterMs } from "../operations/backoff429.js";
import { HttpMethod } from "../../../types/enums.js";
import { RETRY_MAX_DELAY_MS } from "../../../constants/defaults.js";

describe("decideMethod", () => {
  it("stays GET with no ids", () => {
    expect(decideMethod({ db: "pubmed" }, 100)).toBe(HttpMethod.GET);
  });

  it("stays GET at exactly 200 ids", () => {
    const id = Array.from({ length: 200 }, (_, i) => i).join(",");
    expect(decideMethod({ id }, 500)).toBe(HttpMethod.GET);
  });

  it("switches to POST above 200 ids", () => {
    const id = Array.from({ length: 201 }, (_, i) => i).join(",");
    expect(decideMethod({ id }, 500)).toBe(HttpMethod.POST);
  });

  it("switches to POST for an overlong GET URL", () => {
    expect(decideMethod({ db: "pubmed" }, 2001)).toBe(HttpMethod.POST);
  });
});

describe("computeBackoffMs / parseRetryAfterMs", () => {
  it("grows exponentially and caps at the max delay", () => {
    expect(computeBackoffMs(1)).toBeLessThan(computeBackoffMs(3));
    expect(computeBackoffMs(50)).toBe(RETRY_MAX_DELAY_MS);
  });

  it("honors Retry-After (capped) over exponential backoff", () => {
    expect(computeBackoffMs(1, 2000)).toBe(2000);
    expect(computeBackoffMs(1, 999_999)).toBe(RETRY_MAX_DELAY_MS);
  });

  it("parses delta-seconds Retry-After to ms; rejects junk", () => {
    expect(parseRetryAfterMs("2")).toBe(2000);
    expect(parseRetryAfterMs(null)).toBeUndefined();
    expect(parseRetryAfterMs("soon")).toBeUndefined();
  });
});
