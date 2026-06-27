import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import { handleRenderViewer } from "../../tools/renderViewer/renderViewer.js";
import { getHttpServer } from "../httpServer.js";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

let imgDir = "";
let baseUrl = "";
let token = "";

function sessionIdFrom(url: string): string {
  return new URL(url).pathname.replace("/r/", "");
}

async function renderWith(content: string): Promise<string> {
  const out = await handleRenderViewer({ content });
  const url = new URL(out.url);
  token = url.searchParams.get("token") ?? "";
  baseUrl = url.origin;
  return sessionIdFrom(out.url);
}

function fileUrl(name: string, bytes: Buffer): string {
  const full = join(imgDir, name);
  writeFileSync(full, bytes);
  return pathToFileURL(full).href;
}

beforeAll(async () => {
  imgDir = mkdtempSync(join(tmpdir(), "deilen-img-"));
  await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
});

afterAll(async () => {
  await getHttpServer()?.close();
});

describe("local image serving (/api/image)", () => {
  it("serves a file:// png referenced by the document", async () => {
    const sid = await renderWith(`# R\n\n![plot](${fileUrl("plot.png", PNG)})`);
    const res = await fetch(`${baseUrl}/api/image/${sid}/0?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);
  });

  it("serves an svg with the svg mime type", async () => {
    const sid = await renderWith(`![c](${fileUrl("curve.svg", SVG)})`);
    const res = await fetch(`${baseUrl}/api/image/${sid}/0?token=${token}`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/svg+xml");
  });

  it("indexes multiple local images in document order", async () => {
    const a = fileUrl("a.png", PNG);
    const b = fileUrl("b.svg", SVG);
    const sid = await renderWith(`![a](${a})\n\n![b](${b})`);
    const r0 = await fetch(`${baseUrl}/api/image/${sid}/0?token=${token}`);
    const r1 = await fetch(`${baseUrl}/api/image/${sid}/1?token=${token}`);
    expect(r0.headers.get("content-type")).toBe("image/png");
    expect(r1.headers.get("content-type")).toBe("image/svg+xml");
  });

  it("404s an out-of-range index", async () => {
    const sid = await renderWith(`![x](${fileUrl("only.png", PNG)})`);
    const res = await fetch(`${baseUrl}/api/image/${sid}/5?token=${token}`);
    expect(res.status).toBe(404);
  });

  it("404s a non-displayable extension", async () => {
    const sid = await renderWith(
      `![t](${fileUrl("note.txt", Buffer.from("hi"))})`,
    );
    const res = await fetch(`${baseUrl}/api/image/${sid}/0?token=${token}`);
    expect(res.status).toBe(404);
  });

  it("404s when the document references no local image (membership)", async () => {
    const sid = await renderWith("# no images here");
    const res = await fetch(`${baseUrl}/api/image/${sid}/0?token=${token}`);
    expect(res.status).toBe(404);
  });

  it("rejects a request without a token with 401", async () => {
    const sid = await renderWith(`![g](${fileUrl("guard.png", PNG)})`);
    const res = await fetch(`${baseUrl}/api/image/${sid}/0`);
    expect(res.status).toBe(401);
  });

  it("rejects an oversized image with 413", async () => {
    await atomicWrite(
      CONFIG_PATH,
      JSON.stringify({ auto_open: false, max_image_mb: 1 }),
    );
    const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024 + 1024, 0)]);
    const sid = await renderWith(`![big](${fileUrl("big.png", big)})`);
    const res = await fetch(`${baseUrl}/api/image/${sid}/0?token=${token}`);
    expect(res.status).toBe(413);
    await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
  });
});
