import { mkdtempSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { DataFormat } from "../../../../types/enums.js";
import { resolveDataRefs } from "../operations/resolveDataRefs.js";

function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("resolveDataRefs", () => {
  it("rejects a ref id containing path separators (traversal guard)", async () => {
    const dir = tmp("rs-data-");
    await expect(
      resolveDataRefs(dir, [
        { id: "../escape", format: DataFormat.Csv, path: "/tmp/whatever" },
      ]),
    ).rejects.toThrow();
  });

  it("copies a valid ref into the data dir and writes refs.json", async () => {
    const dir = tmp("rs-data-");
    const src = join(tmp("rs-src-"), "in.csv");
    await writeFile(src, "a,b\n1,2\n");
    await resolveDataRefs(dir, [
      { id: "d1", format: DataFormat.Csv, path: src },
    ]);
    const refs = JSON.parse(await readFile(join(dir, "refs.json"), "utf8"));
    expect(refs.d1.file).toBe("d1.csv");
    expect(await readFile(join(dir, "d1.csv"), "utf8")).toContain("1,2");
  });

  it("writes no refs.json when there are no refs", async () => {
    const dir = tmp("rs-data-");
    await resolveDataRefs(dir, []);
    await expect(readFile(join(dir, "refs.json"), "utf8")).rejects.toThrow();
  });
});
