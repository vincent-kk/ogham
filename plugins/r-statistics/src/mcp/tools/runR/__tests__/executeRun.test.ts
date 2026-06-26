import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobStatus, Platform } from "../../../../types/enums.js";

const {
  collectArtifactsMock,
  readManifestMock,
  spawnRscriptMock,
  platformMock,
} = vi.hoisted(() => ({
  collectArtifactsMock: vi.fn(),
  readManifestMock: vi.fn(),
  spawnRscriptMock: vi.fn(),
  platformMock: vi.fn(),
}));

vi.mock("../../../../core/index.js", () => ({
  collectArtifacts: collectArtifactsMock,
  decodeOutput: (buffer: Buffer) => ({
    text: buffer.toString("utf8"),
    truncated: false,
    encodingUsed: "UTF-8",
  }),
  readManifest: readManifestMock,
  spawnRscript: spawnRscriptMock,
}));

vi.mock("../../../../utils/detectPlatform.js", () => ({
  detectPlatform: platformMock,
}));

const { executeRun } = await import("../operations/executeRun.js");

const ACCESS_VIOLATION_EXIT_CODE = 3221225477;

async function makeWorkspace() {
  const dir = await mkdtemp(join(tmpdir(), "rstat-execute-"));
  const artifactsDir = join(dir, "artifacts");
  const dataDir = join(dir, "data");
  await mkdir(artifactsDir);
  await mkdir(dataDir);
  return {
    workspace: {
      workspaceId: "ws_execute_test",
      dir,
      artifactsDir,
      dataDir,
    },
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

function mockSpawn(exitCode: number) {
  spawnRscriptMock.mockResolvedValue({
    exitCode,
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0),
    timedOut: false,
    aborted: false,
  });
}

describe("executeRun Windows shutdown crash classification", () => {
  let cleanup: (() => Promise<void>) | undefined;

  beforeEach(() => {
    readManifestMock.mockResolvedValue(undefined);
    collectArtifactsMock.mockResolvedValue([]);
    platformMock.mockReturnValue(Platform.Windows);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await cleanup?.();
    cleanup = undefined;
  });

  it("treats Windows 0xC0000005 as succeeded when finalize.ok exists", async () => {
    const made = await makeWorkspace();
    cleanup = made.cleanup;
    await writeFile(join(made.workspace.artifactsDir, "finalize.ok"), "");
    mockSpawn(ACCESS_VIOLATION_EXIT_CODE);

    const output = await executeRun({
      workspace: made.workspace,
      rscriptPath: "Rscript",
      scriptPath: join(made.workspace.dir, "script.R"),
      env: {},
      timeoutMs: 1000,
      signal: new AbortController().signal,
    });

    expect(output.status).toBe(JobStatus.Succeeded);
    expect(output.result.error).toBeUndefined();
  });

  it("keeps Windows 0xC0000005 failed when finalize.ok is missing", async () => {
    const made = await makeWorkspace();
    cleanup = made.cleanup;
    mockSpawn(ACCESS_VIOLATION_EXIT_CODE);

    const output = await executeRun({
      workspace: made.workspace,
      rscriptPath: "Rscript",
      scriptPath: join(made.workspace.dir, "script.R"),
      env: {},
      timeoutMs: 1000,
      signal: new AbortController().signal,
    });

    expect(output.status).toBe(JobStatus.Failed);
    expect(output.result.error).toBeDefined();
  });

  it("keeps non-Windows 0xC0000005 failed even when finalize.ok exists", async () => {
    const made = await makeWorkspace();
    cleanup = made.cleanup;
    await writeFile(join(made.workspace.artifactsDir, "finalize.ok"), "");
    platformMock.mockReturnValue(Platform.Macos);
    mockSpawn(ACCESS_VIOLATION_EXIT_CODE);

    const output = await executeRun({
      workspace: made.workspace,
      rscriptPath: "Rscript",
      scriptPath: join(made.workspace.dir, "script.R"),
      env: {},
      timeoutMs: 1000,
      signal: new AbortController().signal,
    });

    expect(output.status).toBe(JobStatus.Failed);
    expect(output.result.error).toBeDefined();
  });
});
