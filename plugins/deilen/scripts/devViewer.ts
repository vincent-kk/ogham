// Dev preview: rebuild the inlined viewer from current src/, render a sample
// document rich in block types (table, list, task, quote, code), and start the
// local server so you can eyeball line-anchored commenting without installing
// the plugin. Rebuilding first is the point — it stops a stale bridge/viewer.html
// from masking your src/ edits. Ctrl+C to stop.
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Re-inline styles/scripts into bridge/viewer.html so src/ edits are served.
execSync("node scripts/buildViewerHtml.mjs", { cwd: root, stdio: "inherit" });

// 2. Render a sample document and start the viewer server.
const { handleRenderViewer } =
  await import("../src/mcp/tools/renderViewer/renderViewer.js");

const SAMPLE = [
  "# deilen dev preview",
  "",
  "표의 한 **행(셀)** 을 드래그 선택하면 뜨는 **Comment** 버튼으로 코멘트를 달면, 그 행 전체가 하이라이트됩니다. 일반 블록은 왼쪽 `+` 거터로도 코멘트할 수 있습니다.",
  "",
  "## 표",
  "",
  "| 패키지  | 역할             | 상태    |",
  "| ------- | ---------------- | ------- |",
  "| filid   | FCA 아키텍처     | 안정    |",
  "| deilen  | 문서 뷰어        | 개발 중 |",
  "| cennad  | 멀티 프로바이더  | 안정    |",
  "| maencof | 지식 그래프 렌즈 | 실험    |",
  "",
  "## 일반 블록",
  "",
  "- 리스트 항목",
  "- [x] 완료된 태스크",
  "- [ ] 남은 태스크",
  "",
  "> 인용문에도 코멘트를 달 수 있습니다.",
  "",
  "```ts",
  "export function anchorTargets(viewer: HTMLElement) {",
  '  return [...viewer.querySelectorAll("tr[data-source-line]")];',
  "}",
  "```",
].join("\n");

const rendered = await handleRenderViewer({
  content: SAMPLE,
  title: "deilen dev preview",
});

console.log(`\n  deilen viewer → ${rendered.url}`);
console.log("  Ctrl+C to stop.\n");

// Keep the process (and its HTTP server) alive until interrupted.
process.stdin.resume();
