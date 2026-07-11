import { afterEach, describe, expect, it, vi } from "vitest";

import { runFinalizer } from "../operations/runFinalizer.js";

afterEach(() => vi.restoreAllMocks());

describe("runFinalizer", () => {
  // Test 1 (basic): flag present → task runs with the ctx, exits 0, returns true
  it("runs the task with the ctx after the flag and exits 0", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const task = vi.fn().mockResolvedValue(undefined);

    const handled = runFinalizer(
      ["node", "entry.js", "--finalize", "/vault"],
      task,
    );

    expect(handled).toBe(true);
    expect(task).toHaveBeenCalledWith("/vault");
    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(0));
  });

  // Test 2 (basic): flag absent → returns false, no task, no exit (normal boot)
  it("returns false and does nothing when the flag is absent", () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const task = vi.fn();

    const handled = runFinalizer(["node", "entry.js"], task);

    expect(handled).toBe(false);
    expect(task).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  // Test 3 (complex): flag present but ctx missing → exits 0 without the task
  it("exits 0 without running the task when the ctx is missing", () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const task = vi.fn();

    const handled = runFinalizer(["node", "entry.js", "--finalize"], task);

    expect(handled).toBe(true);
    expect(task).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  // Test 4 (complex): a custom flag is honored
  it("matches a custom flag", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const task = vi.fn().mockResolvedValue(undefined);

    const handled = runFinalizer(
      ["node", "entry.js", "--sweep", "/project"],
      task,
      "--sweep",
    );

    expect(handled).toBe(true);
    expect(task).toHaveBeenCalledWith("/project");
    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(0));
  });
});
