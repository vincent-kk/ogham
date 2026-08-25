import { PassThrough } from "node:stream";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CONFIG_PATH } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";

let getHttpServer: typeof import("../../httpServer/httpServer.js").getHttpServer;

beforeAll(async () => {
  await atomicWrite(CONFIG_PATH, JSON.stringify({ auto_open: false }));
});

afterEach(async () => {
  await getHttpServer()?.close();
  vi.restoreAllMocks();
});

describe("registerShutdown", () => {
  it("closes the listener and exits when stdin ends", async () => {
    vi.resetModules();
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const { registerShutdown } = await import(
      "../lifecycle/registerShutdown.js"
    );
    const httpServer = await import("../../httpServer/httpServer.js");
    const { ensureHttpServer } = httpServer;
    getHttpServer = httpServer.getHttpServer;
    const input = new PassThrough();

    await ensureHttpServer();
    expect(getHttpServer()).not.toBeNull();
    registerShutdown(input);
    input.resume();
    input.end();
    await new Promise((resolve) => setImmediate(resolve));

    expect(getHttpServer()).toBeNull();
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("runs the shutdown routine once for end followed by close", async () => {
    vi.resetModules();
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    const { registerShutdown } = await import(
      "../lifecycle/registerShutdown.js"
    );
    const httpServer = await import("../../httpServer/httpServer.js");
    const { ensureHttpServer } = httpServer;
    getHttpServer = httpServer.getHttpServer;
    const input = new PassThrough();

    await ensureHttpServer();
    expect(getHttpServer()).not.toBeNull();
    registerShutdown(input);
    input.resume();
    input.end();
    input.destroy();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(exit).toHaveBeenCalledTimes(1);
  });
});
