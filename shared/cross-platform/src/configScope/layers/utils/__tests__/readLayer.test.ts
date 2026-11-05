import { afterEach, describe, expect, it, vi } from "vitest";

import { readUtf8FileIfExistsSync } from "../../../../filesystem/read/readUtf8FileIfExistsSync.js";
import { readLayer } from "../readLayer.js";

vi.mock("../../../../filesystem/read/readUtf8FileIfExistsSync.js");

afterEach(() => vi.resetAllMocks());

describe("readLayer read failures", () => {
  it.each(["EACCES", "EPERM", "EIO", "EISDIR"])(
    "returns null and a diagnostic when reading fails with %s",
    (code) => {
      const warnings: string[] = [];
      vi.mocked(readUtf8FileIfExistsSync).mockImplementation(() => {
        throw Object.assign(new Error(`${code}: cannot read config`), { code });
      });

      expect(readLayer("config.json", warnings)).toBeNull();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("config.json");
      expect(warnings[0]).toContain(code);
    },
  );

  it("keeps absent files distinct from read failures", () => {
    const warnings: string[] = [];
    vi.mocked(readUtf8FileIfExistsSync).mockReturnValue(null);

    expect(readLayer("missing.json", warnings)).toBeNull();
    expect(warnings).toEqual([]);
  });
});
