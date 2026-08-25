import { utimes } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { sessionDir } from "../../../constants/paths.js";
import {
  closeSession,
  createSession,
  hasServingSessions,
  pruneExpired,
  removeSession,
} from "../index.js";

const base = {
  projectHash: "hash",
  title: "t",
  url: "http://127.0.0.1/r/x",
  markdown: "# x",
  createdAt: new Date().toISOString(),
};

describe("serving registry", () => {
  it("registers on create and releases on close", async () => {
    await createSession({ ...base, sessionId: "rs_reg_close" });
    expect(hasServingSessions()).toBe(true);
    expect(await closeSession("rs_reg_close")).toBe(true);
    expect(hasServingSessions()).toBe(false);
  });

  it("leaves the registry untouched when closing an unknown session", async () => {
    await createSession({ ...base, sessionId: "rs_reg_keep" });
    expect(await closeSession("rs_reg_missing")).toBe(false);
    expect(hasServingSessions()).toBe(true);
    await removeSession("rs_reg_keep");
    expect(hasServingSessions()).toBe(false);
  });

  it("releases on TTL prune", async () => {
    await createSession({ ...base, sessionId: "rs_reg_prune" });
    const old = new Date(Date.now() - 100 * 60 * 60 * 1000);
    await utimes(sessionDir("rs_reg_prune"), old, old);
    expect(await pruneExpired(72)).toBeGreaterThanOrEqual(1);
    expect(hasServingSessions()).toBe(false);
  });
});
