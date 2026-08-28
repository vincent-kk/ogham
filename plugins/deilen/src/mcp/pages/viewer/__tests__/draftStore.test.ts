/** Draft persistence keeps browser-only attachments reloadable and degrades safely. */
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Install the browser storage and Blob APIs used by the plain viewer module. */
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
  globalThis.localStorage = window.localStorage;
  globalThis.Blob = window.Blob;
  globalThis.FileReader = window.FileReader;
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
}

/** Reload the module so each case observes a fresh browser seam. */
async function freshDraftStore() {
  vi.resetModules();
  installDom();
  return import("../scripts/draftStore.js");
}

/** Create the storage exception browsers use when the origin quota is full. */
function quotaError(): DOMException {
  return new window.DOMException("quota", "QuotaExceededError");
}

describe("viewer draft storage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("roundtrips attachment data and rebuilds its Blob thumbnail", async () => {
    const { deserializeAttachments, loadDraft, saveDraft } =
      await freshDraftStore();
    const result = await saveDraft("s1", {
      comments: [
        {
          id: "c1",
          anchor: { startLine: 1, endLine: 1, sourceText: "Alpha" },
          text: "note",
          resolved: false,
          attachments: [
            {
              id: "i1",
              name: "shot.png",
              blob: new Blob(["png-bytes"], { type: "image/png" }),
            },
          ],
        },
      ],
      overall: [],
    });

    expect(result).toEqual({
      ok: true,
      imagesDropped: false,
      skipped: false,
    });
    const stored = loadDraft("s1");
    expect(stored.comments[0].attachments[0].dataUrl).toMatch(
      /^data:image\/png;base64,/,
    );
    const [attachment] = deserializeAttachments(stored.comments[0].attachments);
    expect(attachment.blob.type).toBe("image/png");
    expect(attachment.blob.size).toBe(9);
    expect(await attachment.blob.text()).toBe("png-bytes");
    expect(attachment.url).toBe("blob:test");
  });

  it("prunes expired drafts without touching fresh or unrelated keys", async () => {
    const { pruneDrafts } = await freshDraftStore();
    localStorage.setItem(
      "deilen:draft:old",
      JSON.stringify({ savedAt: 0, comments: [], overall: [] }),
    );
    localStorage.setItem(
      "deilen:draft:fresh",
      JSON.stringify({ savedAt: 1_000, comments: [], overall: [] }),
    );
    localStorage.setItem("other:key", "x");

    expect(pruneDrafts(500, 1_200)).toBe(1);
    expect(localStorage.getItem("deilen:draft:old")).toBeNull();
    expect(localStorage.getItem("deilen:draft:fresh")).not.toBeNull();
    expect(localStorage.getItem("other:key")).toBe("x");
  });

  it("retries without attachments after a quota failure", async () => {
    const { loadDraft, saveDraft } = await freshDraftStore();
    vi.spyOn(window.Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw quotaError();
    });

    await expect(
      saveDraft("s1", {
        comments: [
          {
            id: "c1",
            anchor: { startLine: 1, endLine: 1, sourceText: "Alpha" },
            text: "note",
            resolved: false,
            attachments: [
              {
                id: "i1",
                name: "shot.png",
                blob: new Blob(["png"], { type: "image/png" }),
              },
            ],
          },
        ],
        overall: [],
      }),
    ).resolves.toEqual({ ok: true, imagesDropped: true, skipped: false });
    expect(loadDraft("s1")).toMatchObject({
      imagesDropped: true,
      comments: [{ attachments: [] }],
    });
  });

  it("reports failure when both storage writes are rejected", async () => {
    const { loadDraft, saveDraft } = await freshDraftStore();
    vi.spyOn(window.Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError();
    });

    await expect(
      saveDraft("s1", {
        comments: [
          {
            id: "c1",
            anchor: { startLine: 1, endLine: 1, sourceText: "Alpha" },
            text: "note",
            resolved: false,
            attachments: [
              {
                id: "i1",
                name: "shot.png",
                blob: new Blob(["png"], { type: "image/png" }),
              },
            ],
          },
        ],
        overall: [],
      }),
    ).resolves.toEqual({ ok: false, imagesDropped: true, skipped: false });
    expect(loadDraft("s1")).toBeNull();
  });

  it("skips a stale write when its generation guard rejects it", async () => {
    const { saveDraft } = await freshDraftStore();

    await expect(
      saveDraft(
        "s1",
        { comments: [], overall: [] },
        { shouldWrite: () => false },
      ),
    ).resolves.toEqual({ ok: false, imagesDropped: false, skipped: true });
    expect(localStorage.getItem("deilen:draft:s1")).toBeNull();
  });

  it("rejects and removes malformed entries", async () => {
    const { loadDraft } = await freshDraftStore();
    localStorage.setItem(
      "deilen:draft:s1",
      JSON.stringify({
        savedAt: 1,
        comments: [{ id: "c1" }],
        overall: [],
      }),
    );

    expect(loadDraft("s1")).toBeNull();
    expect(localStorage.getItem("deilen:draft:s1")).toBeNull();
  });

  it("drops attachments whose serialized total exceeds the cap", async () => {
    const { loadDraft, saveDraft } = await freshDraftStore();

    const result = await saveDraft("s1", {
      comments: [
        {
          id: "c1",
          anchor: { startLine: 1, endLine: 1, sourceText: "Alpha" },
          text: "note",
          resolved: false,
          attachments: [
            {
              id: "i1",
              name: "large.png",
              blob: new Blob([new Uint8Array(3_000_000)], {
                type: "image/png",
              }),
            },
          ],
        },
      ],
      overall: [],
    });

    expect(result.imagesDropped).toBe(true);
    expect(loadDraft("s1").comments[0].attachments).toEqual([]);
  });

  it("clears a consumed draft", async () => {
    const { clearDraft, loadDraft, saveDraft } = await freshDraftStore();
    await saveDraft("s1", { comments: [], overall: [] });

    clearDraft("s1");

    expect(loadDraft("s1")).toBeNull();
  });
});
