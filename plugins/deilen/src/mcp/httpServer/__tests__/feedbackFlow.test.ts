import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import type { ToolExtra } from "../../shared/index.js";
import { handleCollectFeedback } from "../../tools/collectFeedback/collectFeedback.js";
import { handleCloseViewer } from "../../tools/closeViewer/closeViewer.js";
import { handleRenderViewer } from "../../tools/renderViewer/renderViewer.js";
import { getHttpServer } from "../httpServer.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const extra = { signal: new AbortController().signal } as unknown as ToolExtra;
let baseUrl = "";
let token = "";

function sessionIdFrom(url: string): string {
  return new URL(url).pathname.replace("/r/", "");
}

async function render(content: string): Promise<string> {
  const out = await handleRenderViewer({ content });
  const url = new URL(out.url);
  token = url.searchParams.get("token") ?? "";
  baseUrl = url.origin;
  return sessionIdFrom(out.url);
}

beforeAll(async () => {
  await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
});

afterAll(async () => {
  await getHttpServer()?.close();
});

describe("feedback flow", () => {
  it("delivers a complete multipart submission to a waiting collect", async () => {
    const sid = await render("# Title\n\nbody");
    const collecting = handleCollectFeedback(
      { session_id: sid, wait_seconds: 5 },
      extra,
    );

    const form = new FormData();
    form.append(
      "payload",
      JSON.stringify({
        session_id: sid,
        status: "complete",
        overall: [{ id: "o1", text: "looks good" }],
        comments: [
          {
            id: "c1",
            anchor: { startLine: 1, endLine: 1, sourceText: "# Title" },
            text: "rename this",
            imageIds: ["x1"],
          },
        ],
      }),
    );
    form.append(
      "img_x1",
      new Blob([PNG], { type: "image/png" }),
      "clipboard-1.png",
    );

    const post = await fetch(
      `${baseUrl}/api/feedback?session=${sid}&token=${token}`,
      { method: "POST", body: form },
    );
    expect(post.status).toBe(200);

    const result = await collecting;
    expect("content" in result).toBe(true);
    if ("content" in result) {
      const text = result.content.find((c) => c.type === "text");
      expect(text && "text" in text ? text.text : "").toContain("rename this");
      expect(result.content.some((c) => c.type === "image")).toBe(true);
    }
  });

  it("auto-saves an in_progress JSON draft without waking collect", async () => {
    const sid = await render("para");
    const res = await fetch(
      `${baseUrl}/api/feedback?session=${sid}&token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          status: "in_progress",
          comments: [{ id: "c1", anchor: null, text: "draft" }],
        }),
      },
    );
    expect(res.status).toBe(200);
    const collected = await handleCollectFeedback(
      { session_id: sid, wait_seconds: 0.1 },
      extra,
    );
    expect(collected).toMatchObject({ status: "pending", draft_count: 1 });
  });

  it("rejects an unknown session", async () => {
    await expect(
      handleCollectFeedback({ session_id: "rs_nope" }, extra),
    ).rejects.toThrow(/unknown/);
  });

  it("closes a session so further collects viewer closed", async () => {
    const sid = await render("x");
    expect(await handleCloseViewer({ session_id: sid })).toEqual({
      status: "closed",
    });
    await expect(
      handleCollectFeedback({ session_id: sid }, extra),
    ).rejects.toThrow(/closed/);
  });

  it("rejects an oversized image part", async () => {
    const sid = await render("y");
    await atomicWrite(
      CONFIG_PATH,
      JSON.stringify({ auto_open: false, max_image_mb: 1 }),
    );
    const big = Buffer.alloc(1024 * 1024 + 1024, 1);
    const form = new FormData();
    form.append(
      "payload",
      JSON.stringify({ session_id: sid, status: "complete", comments: [] }),
    );
    form.append("img_x1", new Blob([big], { type: "image/png" }), "big.png");
    const post = await fetch(
      `${baseUrl}/api/feedback?session=${sid}&token=${token}`,
      { method: "POST", body: form },
    );
    expect(post.status).toBe(400);
    await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
  });

  it("rejects multipart whose total image bytes exceed max_payload_mb", async () => {
    const sid = await render("z");
    await atomicWrite(
      CONFIG_PATH,
      JSON.stringify({ auto_open: false, max_image_mb: 1, max_payload_mb: 1 }),
    );
    // Each image is under max_image_mb (1 MB) but together they exceed the
    // aggregate max_payload_mb (1 MB) cap, exercising the totalBytes guard.
    const half = Buffer.alloc(700 * 1024, 1);
    const form = new FormData();
    form.append(
      "payload",
      JSON.stringify({ session_id: sid, status: "complete", comments: [] }),
    );
    form.append("img_x1", new Blob([half], { type: "image/png" }), "a.png");
    form.append("img_x2", new Blob([half], { type: "image/png" }), "b.png");
    const post = await fetch(
      `${baseUrl}/api/feedback?session=${sid}&token=${token}`,
      { method: "POST", body: form },
    );
    expect(post.status).toBe(400);
    await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
  });

  it("closes the session on complete submit and rejects a re-submit with 409", async () => {
    const sid = await render("# Doc\n\nbody");
    const submit = (): Promise<Response> =>
      fetch(`${baseUrl}/api/feedback?session=${sid}&token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          status: "complete",
          comments: [],
        }),
      });
    expect((await submit()).status).toBe(200);
    expect((await submit()).status).toBe(409);
  });

  it("hands a buffered complete to a late collect after the session closed", async () => {
    const sid = await render("late");
    const post = await fetch(
      `${baseUrl}/api/feedback?session=${sid}&token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          status: "complete",
          comments: [{ id: "c1", anchor: null, text: "buffered note" }],
        }),
      },
    );
    expect(post.status).toBe(200);
    const result = await handleCollectFeedback({ session_id: sid }, extra);
    expect("content" in result).toBe(true);
    if ("content" in result) {
      const text = result.content.find((c) => c.type === "text");
      expect(text && "text" in text ? text.text : "").toContain(
        "buffered note",
      );
    }
  });

  it("recovers a complete from disk after the buffer is cleared", async () => {
    const sid = await render("disk recovery");
    const form = new FormData();
    form.append(
      "payload",
      JSON.stringify({
        session_id: sid,
        status: "complete",
        comments: [{ id: "c1", anchor: null, text: "disk note" }],
      }),
    );
    const post = await fetch(
      `${baseUrl}/api/feedback?session=${sid}&token=${token}`,
      { method: "POST", body: form },
    );
    expect(post.status).toBe(200);
    await handleCloseViewer({ session_id: sid });
    const result = await handleCollectFeedback({ session_id: sid }, extra);
    expect("content" in result).toBe(true);
    if ("content" in result) {
      const text = result.content.find((c) => c.type === "text");
      expect(text && "text" in text ? text.text : "").toContain("disk note");
    }
  });

  it("rejects a concurrent second complete submit", async () => {
    const sid = await render("concurrent");
    const submit = (): Promise<Response> =>
      fetch(`${baseUrl}/api/feedback?session=${sid}&token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sid,
          status: "complete",
          comments: [],
        }),
      });
    const [a, b] = await Promise.all([submit(), submit()]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
  });
});
