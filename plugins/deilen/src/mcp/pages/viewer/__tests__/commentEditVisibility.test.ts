/**
 * An open composer stands in for the comment it edits: the saved card leaves the
 * sidebar while the composer is open and returns when the edit ends.
 */
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const VIEW = { session_id: "s1", token: "t1", raw: "Alpha\nBeta" };

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
  globalThis.Node = window.Node;
  globalThis.MouseEvent = window.MouseEvent;
}

function mountViewer(): void {
  document.body.innerHTML = `
    <div id="viewer">
      <p data-source-line="1">Alpha</p>
      <p data-source-line="2">Beta</p>
    </div>
    <div id="comment-list"></div>
    <button id="add-overall"></button>
    <span id="comment-count" hidden></span>
    <div id="submit-status"></div>
    <button id="submit-revise"></button>
    <button id="submit-discuss"></button>
    <button id="close-viewer"></button>
  `;
}

/** Reload the module so its in-memory comment store starts empty per test. */
async function freshViewer() {
  vi.resetModules();
  installDom();
  mountViewer();
  const module = await import("../scripts/comments.js");
  module.initComments(VIEW);
  return module;
}

function composer(): HTMLElement | null {
  return document.querySelector('#comment-list [data-composer="true"]');
}

function cards(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>("#comment-list .comment-card"),
  ];
}

function fillComposer(text: string): void {
  const open = composer();
  if (!open) throw new Error("no composer is open");
  open.querySelector("textarea")!.value = text;
}

function saveComposer(): void {
  composer()!.querySelector<HTMLButtonElement>(".btn-primary")!.click();
}

function addComment(text: string, blockIndex = 0): void {
  const plus =
    document.querySelectorAll<HTMLButtonElement>("#viewer .line-add")[
      blockIndex
    ];
  plus.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  fillComposer(text);
  saveComposer();
}

function addOverallNote(text: string): void {
  document.getElementById("add-overall")!.click();
  fillComposer(text);
  saveComposer();
}

function clickAction(card: HTMLElement, label: string): void {
  const button = [...card.querySelectorAll<HTMLButtonElement>("button")].find(
    (candidate) => candidate.textContent === label,
  );
  if (!button) throw new Error(`no "${label}" action on this card`);
  button.click();
}

describe("comment card visibility while editing", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true })),
    );
  });

  it("hides the edited comment card while its composer is open", async () => {
    await freshViewer();
    addComment("first note");
    expect(cards()).toHaveLength(1);

    clickAction(cards()[0], "Edit");

    expect(composer()).not.toBeNull();
    expect(cards()).toHaveLength(0);
  });

  it("restores the card when the edit is cancelled", async () => {
    await freshViewer();
    addComment("first note");
    clickAction(cards()[0], "Edit");

    composer()!
      .querySelector<HTMLButtonElement>(".btn:not(.btn-primary)")!
      .click();

    expect(composer()).toBeNull();
    expect(cards()).toHaveLength(1);
    expect(cards()[0].querySelector(".comment-body")!.textContent).toBe(
      "first note",
    );
  });

  it("shows one updated card after the edit is saved", async () => {
    await freshViewer();
    addComment("first note");
    clickAction(cards()[0], "Edit");
    fillComposer("edited note");
    saveComposer();

    expect(cards()).toHaveLength(1);
    expect(cards()[0].querySelector(".comment-body")!.textContent).toBe(
      "edited note",
    );
  });

  it("keeps other comment cards visible while one is edited", async () => {
    await freshViewer();
    addComment("first note", 0);
    addComment("second note", 1);
    expect(cards()).toHaveLength(2);

    // Newest first: cards()[0] is "second note".
    clickAction(cards()[0], "Edit");

    expect(cards()).toHaveLength(1);
    expect(cards()[0].querySelector(".comment-body")!.textContent).toBe(
      "first note",
    );
  });

  it("hides the edited overall note while its composer is open", async () => {
    await freshViewer();
    addOverallNote("overall note");
    expect(cards()).toHaveLength(1);

    clickAction(cards()[0], "Edit");

    expect(composer()).not.toBeNull();
    expect(cards()).toHaveLength(0);
  });
});
