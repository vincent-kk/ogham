import { describe, it, expect } from "vitest";
import { pickBodyFormat } from "../pick-body-format.js";

describe("pickBodyFormat", () => {
  it("returns adf for Jira on API v3", () => {
    expect(pickBodyFormat("jira", "3")).toBe("adf");
  });

  it("returns wiki for Jira on API v2", () => {
    expect(pickBodyFormat("jira", "2")).toBe("wiki");
  });

  it("returns storage-v1 for Confluence on v1 (DC)", () => {
    expect(pickBodyFormat("confluence", "v1")).toBe("storage-v1");
  });

  it("returns storage-v2 for Confluence on v2 (Cloud)", () => {
    expect(pickBodyFormat("confluence", "v2")).toBe("storage-v2");
  });
});
