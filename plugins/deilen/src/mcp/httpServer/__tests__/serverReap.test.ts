import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import { handleCloseViewer } from "../../tools/closeViewer/closeViewer.js";
import { handleRenderViewer } from "../../tools/renderViewer/renderViewer.js";
import { getHttpServer } from "../httpServer.js";

function sessionIdFrom(url: string): string {
  return new URL(url).pathname.replace("/r/", "");
}

beforeAll(async () => {
  await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
});

afterAll(async () => {
  await getHttpServer()?.close();
});

describe("server reap on last session close", () => {
  it("stays up while a session is open and reaps after the last one closes", async () => {
    const a = sessionIdFrom((await handleRenderViewer({ content: "a" })).url);
    const b = sessionIdFrom((await handleRenderViewer({ content: "b" })).url);
    expect(getHttpServer()).not.toBeNull();

    await handleCloseViewer({ session_id: a });
    expect(getHttpServer()).not.toBeNull();

    await handleCloseViewer({ session_id: b });
    await vi.waitFor(() => expect(getHttpServer()).toBeNull(), {
      timeout: 5000,
      interval: 50,
    });
  });

  it("restarts the server on a render after a reap", async () => {
    const out = await handleRenderViewer({ content: "revived" });
    expect(out.status).toBe("serving");
    expect(getHttpServer()).not.toBeNull();
  });
});
