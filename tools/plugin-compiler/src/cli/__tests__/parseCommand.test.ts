import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseCommand } from "../parse/parseCommand.js";

describe("parseCommand", () => {
  // --- basic ---

  it("parses a bare sync command", () => {
    expect(parseCommand(["sync"])).toEqual({
      check: false,
      pluginDirectories: [],
    });
  });

  it("recognizes the check flag", () => {
    expect(parseCommand(["sync", "--check"])?.check).toBe(true);
  });

  it("rejects an unknown command", () => {
    expect(parseCommand(["build"])).toBeNull();
  });

  // --- complex ---

  it("rejects an empty argument list", () => {
    expect(parseCommand([])).toBeNull();
  });

  it("resolves plugin directories to absolute paths", () => {
    const command = parseCommand(["sync", "plugins/filid"]);
    expect(command?.pluginDirectories).toEqual([resolve("plugins/filid")]);
  });

  it("keeps the check flag out of the plugin directory list", () => {
    const command = parseCommand(["sync", "--check", "plugins/filid"]);
    expect(command).toEqual({
      check: true,
      pluginDirectories: [resolve("plugins/filid")],
    });
  });

  it("accepts the check flag after the directories", () => {
    expect(parseCommand(["sync", "plugins/filid", "--check"])?.check).toBe(
      true,
    );
  });

  it("keeps multiple plugin directories in order", () => {
    const command = parseCommand(["sync", "plugins/a", "plugins/b"]);
    expect(command?.pluginDirectories).toEqual([
      resolve("plugins/a"),
      resolve("plugins/b"),
    ]);
  });
});
