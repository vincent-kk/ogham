import { afterEach, describe, expect, it, vi } from "vitest";

import { readUtf8FileIfExistsSync } from "../../../../filesystem/read/readUtf8FileIfExistsSync.js";
import { readConfigLayers } from "../readConfigLayers.js";

vi.mock("../../../../filesystem/read/readUtf8FileIfExistsSync.js");

afterEach(() => vi.resetAllMocks());

describe("readConfigLayers read failures", () => {
  it.each(["user", "project"] as const)(
    "preserves the other layer when the %s file cannot be read",
    (failedScope) => {
      vi.mocked(readUtf8FileIfExistsSync).mockImplementation((path) => {
        if (path === `${failedScope}.json`)
          throw new Error("EACCES: permission denied");
        return '{"theme":"dark"}';
      });

      const documents = readConfigLayers({
        user: "user.json",
        project: "project.json",
      });

      expect(documents[failedScope]).toBeNull();
      expect(documents[failedScope === "user" ? "project" : "user"]).toEqual({
        theme: "dark",
      });
      expect(documents.warnings).toHaveLength(1);
      expect(documents.warnings[0]).toContain(`${failedScope}.json`);
      expect(documents.warnings[0]).toContain("EACCES");
    },
  );
});
