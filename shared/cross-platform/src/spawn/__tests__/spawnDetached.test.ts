import { beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock("cross-spawn", () => ({
  default: spawnMock,
}));

import { spawnDetached } from "../spawnDetached.js";

describe("spawnDetached", () => {
  function fakeChild() {
    return { on: vi.fn(), unref: vi.fn() };
  }

  beforeEach(() => {
    spawnMock.mockReset();
    spawnMock.mockReturnValue(fakeChild());
  });

  it("spawns detached + stdio-ignore + hidden, attaches error handler, unrefs", () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    spawnDetached("/abs/node", ["finalize.cjs", "/vault"], { cwd: "/vault" });

    expect(spawnMock).toHaveBeenCalledWith(
      "/abs/node",
      ["finalize.cjs", "/vault"],
      expect.objectContaining({
        stdio: "ignore",
        detached: true,
        windowsHide: true,
        cwd: "/vault",
      }),
    );
    expect(child.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(child.unref).toHaveBeenCalledOnce();
  });

  it("never throws when the spawn itself fails (best-effort)", () => {
    spawnMock.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => spawnDetached("/bad", [])).not.toThrow();
  });

  it("defaults args to an empty array", () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    spawnDetached("/abs/node");

    expect(spawnMock).toHaveBeenCalledWith(
      "/abs/node",
      [],
      expect.objectContaining({ detached: true }),
    );
  });
});
