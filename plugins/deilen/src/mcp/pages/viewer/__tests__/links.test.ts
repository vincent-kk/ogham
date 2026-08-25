/** Viewer document links preserve the active review page. */
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Install an isolated document for the browser-only link helper. */
function installDom(): void {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>", {
    pretendToBeVisual: true,
    url: "https://example.test/",
  });
  Object.defineProperty(globalThis, "window", {
    value: window,
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: window.document,
    configurable: true,
  });
}

describe("viewer link behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    installDom();
  });

  it("opens non-fragment links in a protected new tab", async () => {
    document.body.innerHTML = `
      <div id="viewer">
        <a href="https://example.com/x">ext</a>
        <a href="./other.md">rel</a>
        <a href="#section">frag</a>
      </div>
    `;
    const { openLinksInNewTab } = await import("../scripts/links.js");
    openLinksInNewTab(document.getElementById("viewer"));
    const [external, relative, fragment] = document.querySelectorAll("a");

    for (const anchor of [external, relative]) {
      expect(anchor.getAttribute("target")).toBe("_blank");
      expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
    }
    expect(fragment.hasAttribute("target")).toBe(false);
    expect(fragment.hasAttribute("rel")).toBe(false);
  });
});
