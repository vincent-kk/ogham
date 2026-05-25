import { describe, it, expect } from "vitest";
import { renderByFormat } from "../render-by-format.js";

describe("renderByFormat", () => {
  it("renders adf as a doc node", () => {
    const result = renderByFormat("# H", "adf");
    expect(result).toMatchObject({ type: "doc" });
  });

  it("renders storage-v1 as { storage: { value, representation } } (V1/DC shape)", () => {
    const result = renderByFormat("# H", "storage-v1") as {
      storage: { value: string; representation: string };
    };
    expect(result.storage.representation).toBe("storage");
    expect(typeof result.storage.value).toBe("string");
    expect(result.storage.value.length).toBeGreaterThan(0);
  });

  it("renders storage-v2 as { representation, value } (Cloud V2 shape)", () => {
    const result = renderByFormat("# H", "storage-v2") as {
      representation: string;
      value: string;
    };
    expect(result.representation).toBe("storage");
    expect(typeof result.value).toBe("string");
    expect(result.value.length).toBeGreaterThan(0);
  });

  it("renders wiki as a plain string", () => {
    expect(renderByFormat("# H", "wiki")).toBe("h1. H");
  });

  it("renders empty markdown gracefully across formats", () => {
    expect(renderByFormat("", "wiki")).toBe("");
    const adfEmpty = renderByFormat("", "adf");
    expect(adfEmpty).toMatchObject({ type: "doc" });
    const v1Empty = renderByFormat("", "storage-v1") as {
      storage: { value: string };
    };
    expect(typeof v1Empty.storage.value).toBe("string");
    const v2Empty = renderByFormat("", "storage-v2") as { value: string };
    expect(typeof v2Empty.value).toBe("string");
  });
});
