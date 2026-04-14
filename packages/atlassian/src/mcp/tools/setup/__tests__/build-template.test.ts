import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_PATH = join(__dirname, '..', '__generated__', 'setup-html.ts');
const PAGES_DIR = join(__dirname, '..', '..', '..', 'pages', 'setup');

describe('build-template output (setup-html.ts)', () => {
  // --- basic ---

  it('생성 파일 존재 — __generated__/setup-html.ts', async () => {
    const content = await readFile(GENERATED_PATH, 'utf-8');

    expect(content).toBeTruthy();
    expect(content).toContain('export const SETUP_HTML');
  });

  it('CSS 인라인 — <style> 태그 포함, <link> 제거', async () => {
    const content = await readFile(GENERATED_PATH, 'utf-8');
    const css = await readFile(join(PAGES_DIR, 'styles', 'styles.css'), 'utf-8');

    expect(content).toContain(css.slice(0, 50));
    expect(content).not.toContain('<link href="./styles/styles.css"');
  });

  it('app.js 인라인 — 콘텐츠 포함, <script src> 제거', async () => {
    const content = await readFile(GENERATED_PATH, 'utf-8');
    const appJs = await readFile(join(PAGES_DIR, 'scripts', 'app.js'), 'utf-8');

    expect(content).toContain(appJs.slice(0, 50));
    expect(content).not.toContain('<script src="./scripts/app.js">');
  });

  // --- complex ---

  it('mock-api.js 제거 — 프로덕션 빌드에 미포함', async () => {
    const content = await readFile(GENERATED_PATH, 'utf-8');

    expect(content).not.toContain('mock-api');
    expect(content).not.toContain('__mocks__');
  });

  it('__SETUP_STATE__ 플레이스홀더 보존', async () => {
    const content = await readFile(GENERATED_PATH, 'utf-8');

    expect(content).toContain('__SETUP_STATE__');
  });

  it('json-import.js 인라인 — 콘텐츠 포함, src 태그 제거', async () => {
    const content = await readFile(GENERATED_PATH, 'utf-8');
    const jsonImportJs = await readFile(join(PAGES_DIR, 'scripts', 'json-import.js'), 'utf-8');

    expect(content).toContain(jsonImportJs.slice(0, 50));
    expect(content).not.toContain('<script src="./scripts/json-import.js">');
  });

  it('SETUP_HTML export — 템플릿 리터럴 포맷', async () => {
    const content = await readFile(GENERATED_PATH, 'utf-8');

    expect(content).toContain('export const SETUP_HTML = `');
  });

  it('HTML 구조 보존 — <!DOCTYPE html> 시작', async () => {
    const content = await readFile(GENERATED_PATH, 'utf-8');

    expect(content).toContain('<!DOCTYPE html>');
  });
});
