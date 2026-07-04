/**
 * @file lensReadContainment.test.ts
 * @description lensRead 경로 봉쇄 회귀 테스트.
 *   lens 는 maencof 코어 핸들러에 위임하므로 코어 봉쇄가 lens_read 까지 닫는지 확인한다.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleLensRead } from "../tools/lensRead/lensRead.js";

const SECRET = "TOP SECRET — must never leak through lens_read";

describe("handleLensRead 경로 봉쇄", () => {
  let base: string;
  let vault: string;

  beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), "lens-contain-"));
    vault = join(base, "vault");
    await mkdir(vault, { recursive: true });
    await writeFile(join(base, "secret.md"), SECRET, "utf-8");
  });

  afterEach(async () => {
    await rm(base, { recursive: true, force: true });
  });

  it("vault 밖 traversal 경로의 내용을 유출하지 않는다", async () => {
    const result = await handleLensRead(
      { path: "../secret.md" },
      vault,
      [2, 3, 4, 5],
    );
    expect(result.success).toBe(false);
    expect(result.content).toBe("");
    expect(JSON.stringify(result)).not.toContain("TOP SECRET");
  });

  it("절대 경로도 거부한다", async () => {
    const result = await handleLensRead(
      { path: join(base, "secret.md") },
      vault,
      [2, 3, 4, 5],
    );
    expect(result.success).toBe(false);
    expect(result.content).toBe("");
  });
});
