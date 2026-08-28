// filid:contract AC-P1
// filid:contract AC-P2
// filid:contract AC-P3
// filid:contract AC-P4
// filid:contract AC-P5
// filid:contract AC-P6
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { withFileLockSync } from "@ogham/cross-platform";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CommentProfile } from "../../../types/index.js";
import { loadCommentProfiles } from "../profile/loadCommentProfiles.js";
import { saveCommentProfile } from "../profile/saveCommentProfile.js";

const TEST_DIR = join(
  tmpdir(),
  `atlassian-comment-profiles-${process.pid}-${Date.now()}`,
);
const PROFILE_PATH = join(TEST_DIR, "comment-profiles.json");
const PROFILE: CommentProfile = {
  pattern: "changelog",
  propertyKeys: ["reply.thread"],
  verifiedAt: "2026-08-28T00:00:00.000Z",
};

/** Start an isolated writer process and surface its exit as a promise.
 * @param readyPath File written immediately before the worker attempts the lock.
 * @param hostname Site key written by this worker.
 * @param profile Profile value written by this worker.
 * @returns A promise that resolves only when the worker exits successfully.
 */
function runSaveWorker(
  readyPath: string,
  hostname: string,
  profile: CommentProfile,
): Promise<void> {
  const workerPath = fileURLToPath(
    new URL("./helpers/saveProfileWorker.ts", import.meta.url),
  );
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      workerPath,
      PROFILE_PATH,
      readyPath,
      hostname,
      JSON.stringify(profile),
    ],
    { cwd: process.cwd(), stdio: ["ignore", "ignore", "pipe"] },
  );
  let stderr = "";
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`save worker exited ${code}: ${stderr}`));
    });
  });
}

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("comment profile store", () => {
  it("returns an empty profile map without warnings when the file is missing", async () => {
    const loaded = await loadCommentProfiles(PROFILE_PATH);

    expect([...loaded.sites]).toEqual([]);
    expect(loaded.warnings).toEqual([]);
  });

  it("isolates an unreadable JSON file as one warning", async () => {
    await writeFile(PROFILE_PATH, "{not json", "utf8");

    const loaded = await loadCommentProfiles(PROFILE_PATH);

    expect([...loaded.sites]).toEqual([]);
    expect(loaded.warnings).toHaveLength(1);
    expect(loaded.warnings[0]).toContain("unreadable");
  });

  it("loads every valid site profile", async () => {
    const other = { ...PROFILE, pattern: "standard" as const };
    await writeFile(
      PROFILE_PATH,
      JSON.stringify({
        schemaVersion: 1,
        sites: { "jira.example.com": PROFILE, "jira.other.com": other },
      }),
    );

    const loaded = await loadCommentProfiles(PROFILE_PATH);

    expect(loaded.sites.size).toBe(2);
    expect(loaded.sites.get("jira.example.com")).toEqual(PROFILE);
    expect(loaded.sites.get("jira.other.com")).toEqual(other);
    expect(loaded.warnings).toEqual([]);
  });

  it("drops only the invalid site and names it in a warning", async () => {
    await writeFile(
      PROFILE_PATH,
      JSON.stringify({
        schemaVersion: 1,
        sites: {
          "jira.example.com": PROFILE,
          "jira.invalid.com": { ...PROFILE, propertyKeys: ["../x"] },
        },
      }),
    );

    const loaded = await loadCommentProfiles(PROFILE_PATH);

    expect([...loaded.sites.keys()]).toEqual(["jira.example.com"]);
    expect(loaded.warnings).toHaveLength(1);
    expect(loaded.warnings[0]).toContain("jira.invalid.com");
  });

  it("ignores a foreign schema version without rewriting the file", async () => {
    const original = JSON.stringify({ schemaVersion: 2, sites: {} });
    await writeFile(PROFILE_PATH, original);

    const loaded = await loadCommentProfiles(PROFILE_PATH);

    expect([...loaded.sites]).toEqual([]);
    expect(loaded.warnings).toHaveLength(1);
    expect(await readFile(PROFILE_PATH, "utf8")).toBe(original);
  });

  it("atomically saves one profile while preserving other site JSON", async () => {
    const other = {
      pattern: "unknown",
      propertyKeys: ["legacy.key"],
      verifiedAt: "2026-08-01T00:00:00.000Z",
      futureField: { keep: true },
    };
    await writeFile(
      PROFILE_PATH,
      JSON.stringify({
        schemaVersion: 1,
        sites: { "jira.other.com": other },
      }),
    );

    await saveCommentProfile("jira.example.com", PROFILE, PROFILE_PATH);

    const saved = JSON.parse(await readFile(PROFILE_PATH, "utf8")) as {
      sites: Record<string, unknown>;
    };
    expect(saved.sites["jira.other.com"]).toEqual(other);
    expect(saved.sites["jira.example.com"]).toEqual(PROFILE);
    expect(existsSync(`${PROFILE_PATH}.temp`)).toBe(false);
  });

  it.skipIf(process.platform === "win32")(
    "writes the profile file with owner-only permissions",
    async () => {
      await saveCommentProfile("jira.example.com", PROFILE, PROFILE_PATH);

      expect((await stat(PROFILE_PATH)).mode & 0o777).toBe(0o600);
    },
  );

  it("refuses to overwrite corrupt JSON", async () => {
    await writeFile(PROFILE_PATH, "{not json", "utf8");

    await expect(
      saveCommentProfile("jira.example.com", PROFILE, PROFILE_PATH),
    ).rejects.toThrow("not valid JSON");
  });

  it("refuses incompatible valid JSON envelopes without rewriting them", async () => {
    const incompatible = [
      { schemaVersion: 2, sites: { "jira.old.com": PROFILE } },
      { schemaVersion: 1, sites: [] },
    ];

    for (const value of incompatible) {
      const original = JSON.stringify(value);
      await writeFile(PROFILE_PATH, original, "utf8");

      await expect(
        saveCommentProfile("jira.example.com", PROFILE, PROFILE_PATH),
      ).rejects.toThrow("schema");
      expect(await readFile(PROFILE_PATH, "utf8")).toBe(original);
      expect(existsSync(`${PROFILE_PATH}.temp`)).toBe(false);
      expect(existsSync(`${PROFILE_PATH}.lock`)).toBe(false);
    }
  });

  it("serializes competing process saves without losing either profile", async () => {
    const otherProfile: CommentProfile = {
      pattern: "standard",
      propertyKeys: [],
      verifiedAt: "2026-08-28T01:00:00.000Z",
    };

    const firstReady = join(TEST_DIR, "first.ready");
    const secondReady = join(TEST_DIR, "second.ready");
    const locked = withFileLockSync(PROFILE_PATH, () => {
      const workers = [
        runSaveWorker(firstReady, "jira.example.com", PROFILE),
        runSaveWorker(secondReady, "jira.other.com", otherProfile),
      ];
      const deadline = Date.now() + 5_000;
      const waiter = new Int32Array(new SharedArrayBuffer(4));
      while (
        (!existsSync(firstReady) || !existsSync(secondReady)) &&
        Date.now() < deadline
      )
        Atomics.wait(waiter, 0, 0, 20);
      if (!existsSync(firstReady) || !existsSync(secondReady))
        throw new Error("profile save workers did not reach the lock");
      return workers;
    });
    if (!locked.acquired)
      throw new Error("test could not acquire profile lock");
    await Promise.all(locked.value);

    const saved = JSON.parse(await readFile(PROFILE_PATH, "utf8")) as {
      sites: Record<string, unknown>;
    };
    expect(saved.sites["jira.example.com"]).toEqual(PROFILE);
    expect(saved.sites["jira.other.com"]).toEqual(otherProfile);
    expect(existsSync(`${PROFILE_PATH}.temp`)).toBe(false);
    expect(existsSync(`${PROFILE_PATH}.lock`)).toBe(false);
  });
});
