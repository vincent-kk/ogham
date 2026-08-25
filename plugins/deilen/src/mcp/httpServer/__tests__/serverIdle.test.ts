import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import {
  closeSession,
  hasPendingWaiters,
} from "../../../core/sessionStore/index.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import type { ToolExtra } from "../../shared/index.js";
import { handleCloseViewer } from "../../tools/closeViewer/closeViewer.js";
import { handleCollectFeedback } from "../../tools/collectFeedback/collectFeedback.js";
import { handleRenderViewer } from "../../tools/renderViewer/renderViewer.js";
import { ensureHttpServer, getHttpServer } from "../httpServer.js";

const IDLE_MINUTES = 1;
const IDLE_MS = IDLE_MINUTES * 60_000;
const rendered: string[] = [];

beforeAll(async () => {
  await atomicWrite(
    CONFIG_PATH,
    JSON.stringify({ auto_open: false, idle_shutdown_minutes: IDLE_MINUTES }),
  );
});

afterEach(async () => {
  for (const session_id of rendered.splice(0))
    await handleCloseViewer({ session_id }).catch(() => undefined);
  vi.useRealTimers();
  await getHttpServer()?.close();
});

describe("server idle shutdown", () => {
  it("reaps the singleton after idle_shutdown_minutes when no session is serving", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await ensureHttpServer();
    expect(getHttpServer()).not.toBeNull();

    await vi.advanceTimersByTimeAsync(IDLE_MS + 1_000);
    expect(getHttpServer()).toBeNull();
  });

  it("stays alive across idle windows while a session is serving, then reaps after close", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { session_id } = await handleRenderViewer({
      content: "serving target",
    });
    rendered.push(session_id);

    await vi.advanceTimersByTimeAsync(IDLE_MS * 3);
    expect(getHttpServer()).not.toBeNull();

    await handleCloseViewer({ session_id });
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
    rendered.push(sessionId);
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
    await closeSession(sessionId);

    await vi.advanceTimersByTimeAsync(waitSeconds * 1_000 - 1_000);
    expect(getHttpServer()).not.toBeNull();

    await vi.advanceTimersByTimeAsync(2_000);
    expect(await collecting).toMatchObject({ status: "pending" });
  });
});
