import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * 이 모듈은 브라우저 설정 페이지 번들과 훅 번들에 동시에 들어간다. node 내장을
 * 하나라도 끌어오면 브라우저 번들이 깨지고 훅 번들이 비대해진다.
 *
 * `__tests__/`는 스캔에서 제외한다 — 이 파일 자신이 `node:fs`로 소스를 읽기
 * 때문이다. 테스트는 번들에 들어가지 않으므로 금지 대상이 아니다.
 */
const MODULE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NODE_IMPORT = /from\s+["']node:/;

function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "__tests__") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(path));
    else if (entry.name.endsWith(".ts")) found.push(path);
  }
  return found;
}

describe("configScope/merge stays browser-bundlable", () => {
  it("imports no node builtin outside its tests", () => {
    const files = sourceFiles(MODULE_ROOT);
    const offenders = files.filter((path) =>
      NODE_IMPORT.test(readFileSync(path, "utf8")),
    );

    expect(files.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});
