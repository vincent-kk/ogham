/**
 * A rendered diagram gets an expand affordance that opens a full-screen,
 * pan/zoomable copy — the readable path for diagrams too dense to follow inline.
 */
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it } from "vitest";

const DIAGRAM_SVG =
  '<svg id="deilen-mermaid-0" viewBox="0 0 400 300" style="max-width: 400px"><g><rect width="10" height="10"></rect></g></svg>';

/** jsdom lives in this workspace, not the runner — install it by hand. */
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
  globalThis.Element = window.Element;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.SVGElement = window.SVGElement;
  globalThis.Node = window.Node;
  globalThis.MouseEvent = window.MouseEvent;
  globalThis.WheelEvent = window.WheelEvent;
  globalThis.KeyboardEvent = window.KeyboardEvent;
}

function mountDiagram(inner = DIAGRAM_SVG): HTMLElement {
  document.body.innerHTML = `<div id="viewer"><div class="deilen-mermaid">${inner}</div></div>`;
  return document.querySelector<HTMLElement>(".deilen-mermaid")!;
}

function overlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".diagram-overlay");
}

function canvas(): HTMLElement {
  return overlay()!.querySelector<HTMLElement>(".diagram-canvas")!;
}

function action(name: string): HTMLButtonElement {
  return overlay()!.querySelector<HTMLButtonElement>(
    `[data-diagram-action="${name}"]`,
  )!;
}

/** The scale factor out of `translate(x, y) scale(s)`. */
function currentScale(): number {
  return Number(/scale\(([\d.]+)\)/.exec(canvas().style.transform)?.[1]);
}

/** The translation out of `translate(x, y) scale(s)`. */
function currentOffset(): { x: number; y: number } {
  const match = /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(
    canvas().style.transform,
  );
  return { x: Number(match?.[1]), y: Number(match?.[2]) };
}

async function openLightbox(node: HTMLElement): Promise<void> {
  const { attachExpandButton } = await import("../renderers/expandButton.js");
  attachExpandButton(node);
  node.querySelector<HTMLButtonElement>(".diagram-expand")!.click();
}

describe("diagram lightbox", () => {
  beforeEach(() => {
    installDom();
  });

  it("attaches an expand button to a rendered diagram", async () => {
    const node = mountDiagram();
    const { attachExpandButton } = await import("../renderers/expandButton.js");

    attachExpandButton(node);

    const button = node.querySelector<HTMLButtonElement>(".diagram-expand");
    expect(button).not.toBeNull();
    expect(button!.getAttribute("aria-label")).toMatch(/expand/i);
  });

  it("leaves a block that failed to render without a button", async () => {
    const node = mountDiagram(
      '<div class="render-error">diagram failed to render</div>',
    );
    const { attachExpandButton } = await import("../renderers/expandButton.js");

    attachExpandButton(node);

    expect(node.querySelector(".diagram-expand")).toBeNull();
  });

  it("opens a full-screen copy of the diagram", async () => {
    const node = mountDiagram();

    await openLightbox(node);

    expect(overlay()).not.toBeNull();
    expect(canvas().querySelector("svg")).not.toBeNull();
    // The source diagram stays in the document.
    expect(node.querySelector("svg")).not.toBeNull();
  });

  it("zooms in and back out from the toolbar", async () => {
    await openLightbox(mountDiagram());
    expect(currentScale()).toBe(1);

    action("zoom-in").click();
    const zoomed = currentScale();
    expect(zoomed).toBeGreaterThan(1);

    action("zoom-out").click();
    expect(currentScale()).toBeLessThan(zoomed);
  });

  it("returns to the fitted view on reset", async () => {
    await openLightbox(mountDiagram());
    action("zoom-in").click();
    action("zoom-in").click();

    action("reset").click();

    expect(currentScale()).toBe(1);
    expect(canvas().style.transform).toContain("translate(0px, 0px)");
  });

  it("zooms on wheel and pans on drag", async () => {
    await openLightbox(mountDiagram());
    const stage = overlay()!.querySelector<HTMLElement>(".diagram-stage")!;

    stage.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -120,
        clientX: 10,
        clientY: 10,
        bubbles: true,
      }),
    );
    expect(currentScale()).toBeGreaterThan(1);

    const before = currentOffset();
    stage.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 0, clientY: 0, bubbles: true }),
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 30, clientY: 20, bubbles: true }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    const after = currentOffset();
    expect(after.x - before.x).toBeCloseTo(30);
    expect(after.y - before.y).toBeCloseTo(20);
  });

  it("closes on the close button and on Escape", async () => {
    const node = mountDiagram();
    await openLightbox(node);

    action("close").click();
    expect(overlay()).toBeNull();

    node.querySelector<HTMLButtonElement>(".diagram-expand")!.click();
    expect(overlay()).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(overlay()).toBeNull();
  });
});
