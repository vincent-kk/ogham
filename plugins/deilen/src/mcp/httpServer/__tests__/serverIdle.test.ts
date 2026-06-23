import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import { handleRenderViewer } from "../../tools/renderViewer/renderViewer.js";
import { ensureHttpServer, getHttpServer } from "../httpServer.js";

const IDLE_MINUTES = 1;
const IDLE_MS = IDLE_MINUTES * 60_000;

beforeAll(async () => {
  await atomicWrite(
    CONFIG_PATH,
    JSON.stringify({ auto_open: false, idle_shutdown_minutes: IDLE_MINUTES }),
  );
});

afterEach(async () => {
  vi.useRealTimers();
  await getHttpServer()?.close();
});

describe("server idle shutdown", () => {
  it("reaps the singleton after idle_shutdown_minutes of no activity", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await handleRenderViewer({ content: "idle target" });
    expect(getHttpServer()).not.toBeNull();

    await vi.advanceTimersByTimeAsync(IDLE_MS + 1_000);
    expect(getHttpServer()).toBeNull();
  });

  it("stays alive when activity keeps touching it inside the window", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const server = await ensureHttpServer();

    await vi.advanceTimersByTimeAsync(IDLE_MS - 10_000);
    server.touch();
    await vi.advanceTimersByTimeAsync(IDLE_MS - 10_000);
    expect(getHttpServer()).not.toBeNull();
  });
});
