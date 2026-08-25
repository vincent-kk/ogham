/** Draft restoration hydrates comment state before the viewer first renders. */
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
  globalThis.localStorage = window.localStorage;
  globalThis.Blob = window.Blob;
  globalThis.FileReader = window.FileReader;
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
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

/** Reload the module, optionally seed browser state, then mount comment behavior. */
async function freshViewer(view = VIEW, seed?: () => void) {
  vi.resetModules();
  installDom();
  mountViewer();
  seed?.();
  const module = await import("../scripts/comments.js");
  module.initComments(view);
  return module;
}

/** Build the local entry shared by the restoration and precedence cases. */
function localDraft(text = "local note") {
  return {
    savedAt: Date.now(),
    comments: [
      {
        id: "c3",
        anchor: { startLine: 1, endLine: 1, sourceText: "Alpha" },
        text,
        resolved: false,
        attachments: [
          {
            id: "i1",
            name: "shot.png",
            type: "image/png",
            dataUrl: "data:image/png;base64,cG5nLWJ5dGVz",
          },
        ],
      },
    ],
    overall: [{ id: "o2", text: "overall", attachments: [] }],
  };
}

/** Seed the active session's local draft. */
function seedLocalDraft(text?: string): void {
  localStorage.setItem("deilen:draft:s1", JSON.stringify(localDraft(text)));
}

describe("viewer draft restoration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true })),
    );
  });

  it("restores local cards, anchors, counts, and attachment thumbnails", async () => {
    await freshViewer(VIEW, () => seedLocalDraft());

    expect(document.querySelectorAll(".comment-card")).toHaveLength(2);
    expect(document.getElementById("comment-count")!.textContent).toBe("2");
    expect(
      document
        .querySelector('#viewer [data-source-line="1"]')!
        .getAttribute("data-has-comment"),
    ).toBe("true");
    expect(
      document
        .querySelector<HTMLImageElement>(".comment-card .thumb img")!
        .getAttribute("src"),
    ).toBe("blob:test");
  });

  it("re-seeds ids above restored comments and overall notes", async () => {
    await freshViewer(VIEW, () => seedLocalDraft());
    document.getElementById("add-overall")!.click();
    document.querySelector<HTMLTextAreaElement>(".composer textarea")!.value =
      "new";
    document
      .querySelector<HTMLButtonElement>(".composer .btn-primary")!
      .click();

    await vi.waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem("deilen:draft:s1")!).overall.map(
          (note: { id: string }) => note.id,
        ),
      ).toEqual(["o2", "o3"]),
    );
  });

  it("falls back to the server draft and persists it locally", async () => {
    await freshViewer({
      ...VIEW,
      draft: {
        overall: [],
        comments: [
          {
            id: "c1",
            anchor: { startLine: 2, endLine: 2, sourceText: "Beta" },
            text: "from server",
            imageIds: [],
          },
        ],
        updated_at: "2026-08-25T00:00:00.000Z",
      },
    });

    expect(document.querySelectorAll(".comment-card")).toHaveLength(1);
    expect(document.querySelector(".comment-card")!.textContent).toContain(
      "from server",
    );
    await vi.waitFor(() =>
      expect(JSON.parse(localStorage.getItem("deilen:draft:s1")!)).toMatchObject(
        {
          comments: [
            {
              id: "c1",
              text: "from server",
              anchor: { startLine: 2 },
              attachments: [],
            },
          ],
          overall: [],
        },
      ),
    );
  });

  it("prefers a local draft over a different server draft", async () => {
    await freshViewer(
      {
        ...VIEW,
        draft: {
          overall: [],
          comments: [
            {
              id: "c1",
              anchor: { startLine: 2, endLine: 2, sourceText: "Beta" },
              text: "from server",
              imageIds: [],
            },
          ],
          updated_at: "2026-08-25T00:00:00.000Z",
        },
      },
      () => seedLocalDraft("from localStorage"),
    );

    expect(document.body.textContent).toContain("from localStorage");
    expect(document.body.textContent).not.toContain("from server");
  });

  it("guards unload when a saved card remains unsent", async () => {
    await freshViewer(VIEW, () => seedLocalDraft());
    const event = new window.Event("beforeunload", { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("allows unload when no draft or composer exists", async () => {
    await freshViewer();
    const event = new window.Event("beforeunload", { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("guards unload when an open composer contains unsaved text", async () => {
    await freshViewer();
    document.getElementById("add-overall")!.click();
    document.querySelector<HTMLTextAreaElement>(".composer textarea")!.value =
      "typing";
    const event = new window.Event("beforeunload", { cancelable: true });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
