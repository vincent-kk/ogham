import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { hasPendingWaiters } from "../../../core/sessionStore/index.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import type { ToolExtra } from "../../shared/index.js";
import { handleCollectFeedback } from "../../tools/collectFeedback/collectFeedback.js";
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

  it("stays alive across idle windows while a collect_feedback wait is in-flight", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { url } = await handleRenderViewer({ content: "long wait target" });
    const sessionId = new URL(url).pathname.replace("/r/", "");
    const extra = {
      signal: new AbortController().signal,
    } as unknown as ToolExtra;
    const waitSeconds = (IDLE_MS * 3) / 1_000;

    const collecting = handleCollectFeedback(
      { session_id: sessionId, wait_seconds: waitSeconds },
      extra,
    );
    // handleCollectFeedback awaits real disk reads before it registers its
    // waiter — let those settle (real setImmediate ticks, not fake timers)
    // before advancing the fake clock, or the idle check below could run
    // before the waiter it's supposed to observe exists.
    while (!hasPendingWaiters())
      await new Promise((resolve) => setImmediate(resolve));

    await vi.advanceTimersByTimeAsync(waitSeconds * 1_000 - 1_000);
    expect(getHttpServer()).not.toBeNull();

    await vi.advanceTimersByTimeAsync(2_000);
    expect(await collecting).toMatchObject({ status: "pending" });
  });
});
