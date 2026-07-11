import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { spawnDetachedMock } = vi.hoisted(() => ({
  spawnDetachedMock: vi.fn(),
}));
vi.mock("@ogham/cross-platform/spawn", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@ogham/cross-platform/spawn")>();
  return { ...actual, spawnDetached: spawnDetachedMock };
});

type RegisterShutdownFinalizer =
  typeof import("../operations/registerShutdownFinalizer.js").registerShutdownFinalizer;

// The once-guard is module-scoped, so each case loads a fresh module instance.
async function loadFresh(): Promise<RegisterShutdownFinalizer> {
  vi.resetModules();
  return (await import("../operations/registerShutdownFinalizer.js"))
    .registerShutdownFinalizer;
}

function listenerSnapshot() {
  return {
    exit: process.listeners("exit"),
    SIGINT: process.listeners("SIGINT"),
    SIGTERM: process.listeners("SIGTERM"),
  };
}

let toRemove: ReturnType<typeof listenerSnapshot> | undefined;

function addedSince(before: ReturnType<typeof listenerSnapshot>) {
  toRemove = {
    exit: process.listeners("exit").filter((l) => !before.exit.includes(l)),
    SIGINT: process
      .listeners("SIGINT")
      .filter((l) => !before.SIGINT.includes(l)),
    SIGTERM: process
      .listeners("SIGTERM")
      .filter((l) => !before.SIGTERM.includes(l)),
  };
  return toRemove;
}

beforeEach(() => vi.clearAllMocks());

afterEach(() => {
  if (toRemove) {
    for (const l of toRemove.exit) process.removeListener("exit", l);
    for (const l of toRemove.SIGINT) process.removeListener("SIGINT", l);
    for (const l of toRemove.SIGTERM) process.removeListener("SIGTERM", l);
    toRemove = undefined;
  }
  vi.restoreAllMocks();
});

describe("registerShutdownFinalizer", () => {
  // Test 1 (basic): the exit handler runs onShutdown synchronously
  it("runs onShutdown synchronously on the exit handler", async () => {
    const before = listenerSnapshot();
    const register = await loadFresh();
    const onShutdown = vi.fn();

    register({ ctx: "/vault", onShutdown });
    const added = addedSince(before);

    expect(added.exit).toHaveLength(1);
    (added.exit[0] as () => void)();
    expect(onShutdown).toHaveBeenCalledWith("/vault");
  });

  // Test 2 (basic): registration is once-only across repeat calls
  it("registers listeners exactly once across repeat calls", async () => {
    const before = listenerSnapshot();
    const register = await loadFresh();

    register({ ctx: "/vault" });
    register({ ctx: "/vault" });
    const added = addedSince(before);

    expect(added.exit).toHaveLength(1);
    expect(added.SIGINT).toHaveLength(1);
    expect(added.SIGTERM).toHaveLength(1);
  });

  // Test 3 (basic): detached spawns the finalizer on SIGINT, then exits 0
  it("spawns the detached finalizer on SIGINT when detached", async () => {
    const before = listenerSnapshot();
    const register = await loadFresh();
    register({ ctx: "/vault", detached: true });
    const added = addedSince(before);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    (added.SIGINT[0] as () => void)();

    expect(spawnDetachedMock).toHaveBeenCalledWith(process.execPath, [
      process.argv[1],
      "--finalize",
      "/vault",
    ]);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  // Test 4 (complex): a failing guard suppresses onShutdown and spawn, still exits
  it("skips onShutdown and spawn when the guard fails", async () => {
    const before = listenerSnapshot();
    const register = await loadFresh();
    const onShutdown = vi.fn();
    register({ ctx: "/nope", guard: () => false, onShutdown, detached: true });
    const added = addedSince(before);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    (added.SIGINT[0] as () => void)();

    expect(onShutdown).not.toHaveBeenCalled();
    expect(spawnDetachedMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  // Test 5 (complex): omitting detached (sync-only) never spawns
  it("does not spawn when detached is omitted", async () => {
    const before = listenerSnapshot();
    const register = await loadFresh();
    const onShutdown = vi.fn();
    register({ ctx: "/vault", onShutdown });
    const added = addedSince(before);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    (added.SIGINT[0] as () => void)();

    expect(onShutdown).toHaveBeenCalledWith("/vault");
    expect(spawnDetachedMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  // Test 6 (complex): a custom flag flows into the spawn args
  it("honors a custom finalize flag in the spawn args", async () => {
    const before = listenerSnapshot();
    const register = await loadFresh();
    register({ ctx: "/vault", detached: true, flag: "--sweep" });
    const added = addedSince(before);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    (added.SIGINT[0] as () => void)();

    expect(spawnDetachedMock).toHaveBeenCalledWith(process.execPath, [
      process.argv[1],
      "--sweep",
      "/vault",
    ]);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
