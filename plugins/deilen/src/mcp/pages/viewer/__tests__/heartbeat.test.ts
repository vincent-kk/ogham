/** Heartbeat state changes tolerate transient failures and stop at final state. */
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type PingResponse = { ok: boolean; status: number };

/** Install a visible document so visibility-triggered pings can be exercised. */
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
}

/** Advance one heartbeat interval and flush its promise continuation. */
async function advanceHeartbeat(): Promise<void> {
  await vi.advanceTimersByTimeAsync(1_000);
}

describe("session heartbeat", () => {
  beforeEach(() => {
    vi.resetModules();
    installDom();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not go offline after two transient failures", async () => {
    const { startHeartbeat } = await import("../scripts/heartbeat.js");
    const ping = vi
      .fn<() => Promise<PingResponse>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ ok: true, status: 200 });
    const states: string[] = [];
    const heartbeat = startHeartbeat({
      ping,
      intervalMs: 1_000,
      onState: (state: string) => states.push(state),
    });

    await advanceHeartbeat();
    await advanceHeartbeat();

    expect(states).not.toContain("offline");
    expect(states.at(-1)).toBe("alive");
    heartbeat.stop();
  });

  it("emits offline once after repeated failures and recovers on success", async () => {
    const { startHeartbeat } = await import("../scripts/heartbeat.js");
    const ping = vi
      .fn<() => Promise<PingResponse>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ ok: true, status: 200 });
    const states: string[] = [];
    const heartbeat = startHeartbeat({
      ping,
      intervalMs: 1_000,
      onState: (state: string) => states.push(state),
    });

    await advanceHeartbeat();
    await advanceHeartbeat();
    expect(states.at(-1)).toBe("offline");
    await advanceHeartbeat();
    await advanceHeartbeat();
    expect(states.filter((state) => state === "offline")).toHaveLength(1);
    await advanceHeartbeat();
    expect(states.at(-1)).toBe("alive");
    heartbeat.stop();
  });

  it("counts non-404 HTTP failures toward offline and recovers", async () => {
    const { startHeartbeat } = await import("../scripts/heartbeat.js");
    const ping = vi
      .fn<() => Promise<PingResponse>>()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({ ok: true, status: 200 });
    const states: string[] = [];
    const heartbeat = startHeartbeat({
      ping,
      intervalMs: 1_000,
      onState: (state: string) => states.push(state),
    });

    await advanceHeartbeat();
    await advanceHeartbeat();
    expect(states.at(-1)).toBe("offline");
    await advanceHeartbeat();
    expect(states.at(-1)).toBe("alive");
    heartbeat.stop();
  });

  it("treats 404 as final and sends no later pings", async () => {
    const { startHeartbeat } = await import("../scripts/heartbeat.js");
    const ping = vi
      .fn<() => Promise<PingResponse>>()
      .mockResolvedValue({ ok: false, status: 404 });
    const states: string[] = [];
    startHeartbeat({
      ping,
      intervalMs: 1_000,
      onState: (state: string) => states.push(state),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(states.at(-1)).toBe("ended");
    await vi.advanceTimersByTimeAsync(3_000);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("treats 401 as final offline and sends no later pings", async () => {
    const { startHeartbeat } = await import("../scripts/heartbeat.js");
    const ping = vi
      .fn<() => Promise<PingResponse>>()
      .mockResolvedValue({ ok: false, status: 401 });
    const states: string[] = [];
    startHeartbeat({
      ping,
      intervalMs: 1_000,
      onState: (state: string) => states.push(state),
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(states).toEqual(["offline"]);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("ignores an in-flight ping result after stop", async () => {
    const { startHeartbeat } = await import("../scripts/heartbeat.js");
    let resolvePing = (_response: PingResponse): void => {};
    const ping = vi.fn(
      () =>
        new Promise<PingResponse>((resolve) => {
          resolvePing = resolve;
        }),
    );
    const states: string[] = [];
    const heartbeat = startHeartbeat({
      ping,
      intervalMs: 1_000,
      onState: (state: string) => states.push(state),
    });

    heartbeat.stop();
    resolvePing({ ok: true, status: 200 });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(3_000);

    expect(states).toEqual([]);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("pings immediately when the document becomes visible", async () => {
    const { startHeartbeat } = await import("../scripts/heartbeat.js");
    const ping = vi
      .fn<() => Promise<PingResponse>>()
      .mockResolvedValue({ ok: true, status: 200 });
    const heartbeat = startHeartbeat({
      ping,
      intervalMs: 1_000,
      onState: vi.fn(),
    });
    await vi.advanceTimersByTimeAsync(0);

    document.dispatchEvent(new window.Event("visibilitychange"));

    expect(ping).toHaveBeenCalledTimes(2);
    heartbeat.stop();
  });
});
