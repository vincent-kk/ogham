import { mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { withFileLockSync } from "../locking/operations/withFileLockSync.js";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    mkdirSync: vi.fn(actual.mkdirSync),
    renameSync: vi.fn(actual.renameSync),
    statSync: vi.fn(actual.statSync),
    writeFileSync: vi.fn(actual.writeFileSync),
  };
});

const fs = await vi.importActual<typeof import("node:fs")>("node:fs");
const platform = process.platform;
const contentionCodes = ["EPERM", "EACCES", "EBUSY"] as const;

let root: string;
let target: string;
let lock: string;

beforeEach(() => {
  root = fs.mkdtempSync(join(tmpdir(), "ogham-lock-contention-"));
  target = join(root, "state");
  lock = `${target}.lock`;
  Object.defineProperty(process, "platform", { value: "win32" });
});

afterEach(() => {
  Object.defineProperty(process, "platform", { value: platform });
  vi.resetAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

function errno(code: string): Error {
  return Object.assign(new Error(code), { code });
}

it.each(contentionCodes)("retries mkdir after Windows %s", (code) => {
  let attempts = 0;
  vi.mocked(mkdirSync).mockImplementation((path, options) => {
    if (path === lock && ++attempts === 1) throw errno(code);
    return fs.mkdirSync(path, options);
  });
  const operation = vi.fn(() => "recorded");

  expect(withFileLockSync(target, operation)).toEqual({
    acquired: true,
    value: "recorded",
  });
  expect(attempts).toBe(2);
  expect(operation).toHaveBeenCalledOnce();
});

it("does not run the operation when contention reaches the deadline", () => {
  vi.mocked(mkdirSync).mockImplementation((path, options) => {
    if (path === lock) throw errno("EPERM");
    return fs.mkdirSync(path, options);
  });
  const operation = vi.fn();

  expect(withFileLockSync(target, operation, { timeoutMs: 0 })).toEqual({
    acquired: false,
  });
  expect(operation).not.toHaveBeenCalled();
});

it("retries acquisition when the contending directory cannot be inspected", () => {
  let attempts = 0;
  vi.mocked(mkdirSync).mockImplementation((path, options) => {
    if (path === lock && ++attempts === 1) throw errno("EEXIST");
    return fs.mkdirSync(path, options);
  });
  vi.mocked(statSync).mockImplementationOnce(() => {
    throw errno("EACCES");
  });

  expect(withFileLockSync(target, () => "recorded")).toEqual({
    acquired: true,
    value: "recorded",
  });
  expect(attempts).toBe(2);
});

it("retries owner token creation without leaving a lock from the failed attempt", () => {
  vi.mocked(writeFileSync).mockImplementationOnce(() => {
    throw errno("EBUSY");
  });

  expect(withFileLockSync(target, () => "recorded")).toEqual({
    acquired: true,
    value: "recorded",
  });
  expect(fs.existsSync(lock)).toBe(false);
});

it("keeps the stale lock and skips the operation if quarantine is blocked at the deadline", () => {
  fs.mkdirSync(lock);
  fs.utimesSync(lock, new Date(0), new Date(0));
  vi.mocked(renameSync).mockImplementation(() => {
    throw errno("EPERM");
  });
  const operation = vi.fn();

  expect(withFileLockSync(target, operation, { timeoutMs: 0 })).toEqual({
    acquired: false,
  });
  expect(operation).not.toHaveBeenCalled();
  expect(fs.existsSync(lock)).toBe(true);
});

it("propagates a permission failure outside native Windows", () => {
  Object.defineProperty(process, "platform", { value: "linux" });
  vi.mocked(mkdirSync).mockImplementation((path, options) => {
    if (path === lock) throw errno("EACCES");
    return fs.mkdirSync(path, options);
  });
  const operation = vi.fn();

  expect(() => withFileLockSync(target, operation)).toThrow("EACCES");
  expect(operation).not.toHaveBeenCalled();
});

it.each(contentionCodes)("retries release rename after Windows %s", (code) => {
  vi.mocked(renameSync).mockImplementationOnce(() => {
    throw errno(code);
  });

  expect(withFileLockSync(target, () => "saved")).toEqual({
    acquired: true,
    value: "saved",
  });
  expect(renameSync).toHaveBeenCalledTimes(2);
  expect(fs.existsSync(lock)).toBe(false);
});

it("keeps the completed result when release retries are exhausted", () => {
  vi.mocked(renameSync).mockImplementation(() => {
    throw errno("EBUSY");
  });
  const operation = vi.fn(() => "saved");

  expect(withFileLockSync(target, operation)).toEqual({
    acquired: true,
    value: "saved",
  });
  expect(operation).toHaveBeenCalledOnce();
  expect(renameSync).toHaveBeenCalledTimes(3);
  expect(fs.existsSync(lock)).toBe(true);
});

it("preserves the operation error when release fails independently", () => {
  vi.mocked(renameSync).mockImplementation(() => {
    throw errno("EIO");
  });
  const failure = new Error("failed to persist state");

  expect(() =>
    withFileLockSync(target, () => {
      throw failure;
    }),
  ).toThrow(failure);
  expect(renameSync).toHaveBeenCalledOnce();
});

it("checks the owner again before retrying release", () => {
  vi.mocked(renameSync).mockImplementationOnce(() => {
    fs.writeFileSync(join(lock, "owner"), "replacement");
    throw errno("EPERM");
  });

  expect(withFileLockSync(target, () => "saved")).toEqual({
    acquired: true,
    value: "saved",
  });
  expect(renameSync).toHaveBeenCalledOnce();
  expect(fs.readFileSync(join(lock, "owner"), "utf8")).toBe("replacement");
});
