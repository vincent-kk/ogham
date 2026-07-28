#!/usr/bin/env node
/**
 * Pre-render Mermaid gate for /deilen:preview.
 * loaded by agent skill step 3; run the in-tree script (do not copy to /tmp —
 * bare imports resolve from this file's directory upward):
 *   node plugins/deilen/skills/preview/references/mmdcheck.mjs /abs/path/doc.md
 *   # or: cat doc.md | node …/mmdcheck.mjs
 *
 * Needs `mermaid` and `jsdom` on the walk from this file (deilen ships both as
 * devDependencies). Exit 0 = all fences parse (or skip if a dep is missing);
 * non-zero = fix before render. On skip, print a line the agent must mention.
 */
import { readFileSync } from "node:fs";

function extractMermaidFences(markdown) {
  const fences = [];
  const re = /```mermaid\s*\n([\s\S]*?)```/gi;
  let match;
  while ((match = re.exec(markdown)) !== null)
    fences.push({ index: fences.length + 1, source: match[1].trimEnd() });
  return fences;
}

async function main() {
  let JSDOM;
  try {
    ({ JSDOM } = await import("jsdom"));
  } catch {
    console.error("mmdcheck: jsdom not resolvable — skip parse gate");
    process.exit(0);
  }

  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "https://example.test/",
  });
  const { window } = dom;
  Object.defineProperty(globalThis, "window", {
    value: window,
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: window.document,
    configurable: true,
  });
  globalThis.Element = window.Element;
  globalThis.SVGElement = window.SVGElement;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.DocumentFragment = window.DocumentFragment;
  globalThis.Node = window.Node;
  globalThis.DOMParser = window.DOMParser;
  globalThis.XMLSerializer = window.XMLSerializer;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);

  let mermaid;
  try {
    ({ default: mermaid } = await import("mermaid"));
  } catch {
    console.error("mmdcheck: mermaid not resolvable — skip parse gate");
    process.exit(0);
  }

  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

  const inputPath = process.argv[2];
  const markdown = inputPath
    ? readFileSync(inputPath, "utf8")
    : readFileSync(0, "utf8");
  const fences = extractMermaidFences(markdown);
  if (fences.length === 0) {
    console.log("mmdcheck: no mermaid fences");
    return;
  }

  let failed = 0;
  for (const fence of fences)
    try {
      await mermaid.parse(fence.source);
      console.log(`ok  #${fence.index}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`fail #${fence.index}: ${message.split("\n")[0]}`);
      console.error(fence.source.split("\n").slice(0, 8).join("\n"));
    }
  if (failed > 0) {
    console.error(`mmdcheck: ${failed}/${fences.length} fence(s) failed`);
    process.exit(1);
  }
  console.log(`mmdcheck: ${fences.length} fence(s) ok`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
