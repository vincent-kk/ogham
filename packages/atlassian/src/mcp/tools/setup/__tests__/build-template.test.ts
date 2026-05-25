import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_PATH = join(__dirname, "..", "__generated__", "setup-html.ts");

describe("build-template output (setup-html.ts)", () => {
  // --- basic ---

  it("생성 파일 존재 — __generated__/setup-html.ts", async () => {
    const content = await readFile(GENERATED_PATH, "utf-8");

    expect(content).toBeTruthy();
    expect(content).toContain("export const SETUP_HTML");
  });

  it("CSS 인라인 — <style> 태그 포함, <link> 제거", async () => {
    const content = await readFile(GENERATED_PATH, "utf-8");

    expect(content).toContain(".container{");
    expect(content).not.toContain('<link href="./styles/styles.css"');
  });

  it("app.js 인라인 — 콘텐츠 포함, <script src> 제거", async () => {
    const content = await readFile(GENERATED_PATH, "utf-8");

    expect(content).toContain("__setupApp");
    expect(content).not.toContain('<script src="./scripts/app.js">');
  });

  // --- complex ---

  it("mock-api.js 제거 — 프로덕션 빌드에 미포함", async () => {
    const content = await readFile(GENERATED_PATH, "utf-8");

    expect(content).not.toContain("mock-api");
    expect(content).not.toContain("__mocks__");
  });

  it("__SETUP_STATE__ 플레이스홀더 보존", async () => {
    const content = await readFile(GENERATED_PATH, "utf-8");

    expect(content).toContain("__SETUP_STATE__");
  });

  it("json-import.js 인라인 — 콘텐츠 포함, src 태그 제거", async () => {
    const content = await readFile(GENERATED_PATH, "utf-8");

    expect(content).toContain("btn-import");
    expect(content).not.toContain('<script src="./scripts/json-import.js">');
  });

  it("SETUP_HTML export — JSON string 포맷", async () => {
    const content = await readFile(GENERATED_PATH, "utf-8");

    expect(content).toContain('export const SETUP_HTML = "');
  });

  it("HTML 구조 보존 — <!doctype html> 시작", async () => {
    const content = await readFile(GENERATED_PATH, "utf-8");

    expect(content).toContain("<!doctype html>");
  });
});
