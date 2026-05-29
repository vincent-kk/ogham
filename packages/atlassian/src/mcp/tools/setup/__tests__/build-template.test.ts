import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// __tests__ -> setup -> tools -> mcp -> src -> package root
const PACKAGE_ROOT = join(__dirname, "..", "..", "..", "..", "..");
const SETTINGS_HTML_PATH = join(PACKAGE_ROOT, "public", "settings.html");

// `yarn clean` removes public/; build the asset on demand so `vitest run`
// works standalone without a prior `yarn build`.
beforeAll(() => {
  if (!existsSync(SETTINGS_HTML_PATH)) {
    execFileSync(
      "node",
      [join(PACKAGE_ROOT, "scripts", "build-settings-html.mjs")],
      { cwd: PACKAGE_ROOT, stdio: "inherit" },
    );
  }
});

describe("build-settings-html output (public/settings.html)", () => {
  // --- basic ---

  it("생성 파일 존재 — public/settings.html, <!doctype html> 시작", async () => {
    const content = await readFile(SETTINGS_HTML_PATH, "utf-8");

    expect(content).toBeTruthy();
    expect(content.trimStart().startsWith("<!doctype html>")).toBe(true);
  });

  it("CSS 인라인 — <style> 태그 포함, <link> 제거", async () => {
    const content = await readFile(SETTINGS_HTML_PATH, "utf-8");

    expect(content).toContain(".container{");
    expect(content).not.toContain('<link href="./styles/styles.css"');
  });

  it("app.js 인라인 — 콘텐츠 포함, <script src> 제거", async () => {
    const content = await readFile(SETTINGS_HTML_PATH, "utf-8");

    expect(content).toContain("__settingsApp");
    expect(content).not.toContain('<script src="./scripts/app.js">');
  });

  // --- complex ---

  it("mock-api.js 제거 — 프로덕션 빌드에 미포함", async () => {
    const content = await readFile(SETTINGS_HTML_PATH, "utf-8");

    expect(content).not.toContain("mock-api");
    expect(content).not.toContain("__mocks__");
  });

  it("__SETTINGS_STATE__ 플레이스홀더 보존", async () => {
    const content = await readFile(SETTINGS_HTML_PATH, "utf-8");

    expect(content).toContain("__SETTINGS_STATE__");
  });

  it("json-import.js 인라인 — 콘텐츠 포함, src 태그 제거", async () => {
    const content = await readFile(SETTINGS_HTML_PATH, "utf-8");

    expect(content).toContain("btn-import");
    expect(content).not.toContain('<script src="./scripts/json-import.js">');
  });

  it("정적 HTML 산출 — TS 문자열 모듈 형태가 아님", async () => {
    const content = await readFile(SETTINGS_HTML_PATH, "utf-8");

    expect(content).not.toContain("export const SETUP_HTML");
    expect(content).not.toContain("export const SETTINGS_HTML");
  });
});
