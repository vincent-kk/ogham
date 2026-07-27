/**
 * Locks flowchart node-id reserved words against the viewer's mermaid version,
 * and against skills/preview so the agent guide cannot drift from the parser.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";

/** Bare flowchart node ids that the installed mermaid rejects (see package.json). */
const RESERVED_FLOWCHART_NODE_IDS = [
  "interpolate",
  "end",
  "graph",
  "subgraph",
  "style",
  "linkStyle",
  "class",
  "classDef",
  "flowchart",
] as const;

/** Domain words that look keyword-like but currently parse as node ids. */
const SAFE_FLOWCHART_NODE_IDS = [
  "click",
  "call",
  "href",
  "normalize",
  "default",
  "direction",
  "state",
  "note",
  "interpolate_step",
] as const;

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../../");

async function installDom(): Promise<typeof import("mermaid").default> {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "https://example.test/",
  });
  const { window } = dom;
  Object.defineProperty(globalThis, "window", { value: window, configurable: true });
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

  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
  return mermaid;
}

describe("mermaid flowchart reserved node ids", () => {
  let mermaid: Awaited<ReturnType<typeof installDom>>;

  beforeAll(async () => {
    mermaid = await installDom();
  });

  it("rejects every reserved flowchart node id", async () => {
    const rejected: string[] = [];
    for (const id of RESERVED_FLOWCHART_NODE_IDS) {
      try {
        await mermaid.parse(`flowchart TD\n  ${id}["Label"] --> ok["OK"]`);
      } catch {
        rejected.push(id);
      }
    }
    expect(rejected).toEqual([...RESERVED_FLOWCHART_NODE_IDS]);
  });

  it("accepts safe domain-like flowchart node ids", async () => {
    for (const id of SAFE_FLOWCHART_NODE_IDS) {
      await expect(
        mermaid.parse(`flowchart TD\n  ${id}["Label"] --> ok["OK"]`),
      ).resolves.toBeTruthy();
    }
  });

  it("documents every reserved id in visuals.md", () => {
    const visuals = readFileSync(
      join(pluginRoot, "skills/preview/references/visuals.md"),
      "utf8",
    );
    expect(visuals).toMatch(/reserved.*node id|node id.*reserved/i);
    for (const id of RESERVED_FLOWCHART_NODE_IDS) {
      expect(visuals, `visuals.md must mention reserved id ${id}`).toContain(id);
    }
  });

  it("instructs pre-render mermaid.parse in preview SKILL.md", () => {
    const skill = readFileSync(join(pluginRoot, "skills/preview/SKILL.md"), "utf8");
    expect(skill).toMatch(/mermaid\.parse/);
  });
});
