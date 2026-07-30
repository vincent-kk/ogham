import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

describe("filesystem package entry points", () => {
  it("root-exports only concrete purpose-specific read modules", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as { exports: Record<string, unknown>; sideEffects: boolean };
    const rootSource = readFileSync(
      resolve(packageRoot, "src", "index.ts"),
      "utf8",
    );

    expect(Object.keys(manifest.exports)).toEqual([".", "./agy-runner/main"]);
    expect(manifest.sideEffects).toBe(false);
    expect(rootSource).toContain(
      'export { listDirectoryIfExistsSync } from "./filesystem/read/listDirectoryIfExistsSync.js";',
    );
    expect(rootSource).toContain(
      'export { readFileIfExistsSync } from "./filesystem/read/readFileIfExistsSync.js";',
    );
    expect(rootSource).toContain(
      'export { readUtf8FileIfExistsSync } from "./filesystem/read/readUtf8FileIfExistsSync.js";',
    );
    expect(
      existsSync(resolve(packageRoot, "src", "filesystem", "index.ts")),
    ).toBe(true);
    expect(
      existsSync(resolve(packageRoot, "src", "filesystem", "read", "index.ts")),
    ).toBe(false);
  });

  it("root-exports lightweight hook I/O and retains its internal barrel", () => {
    const rootSource = readFileSync(
      resolve(packageRoot, "src", "index.ts"),
      "utf8",
    );

    expect(rootSource).toContain(
      'export { copyFileSync } from "./filesystem/hookIo/operations/copyFileSync.js";',
    );
    expect(rootSource).toContain(
      'export { writeUtf8FileSync } from "./filesystem/hookIo/operations/writeUtf8FileSync.js";',
    );
    expect(rootSource).not.toContain('from "./filesystem/hookIo/index.js"');
    expect(
      existsSync(
        resolve(packageRoot, "src", "filesystem", "hookIo", "index.ts"),
      ),
    ).toBe(true);
  });
});
