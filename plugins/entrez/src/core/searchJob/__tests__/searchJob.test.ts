import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createJob } from "../operations/createJob.js";
import { getJob } from "../operations/getJob.js";
import { updateJob } from "../operations/updateJob.js";
import { pollResults } from "../operations/pollResults.js";
import { JobStatus } from "../../../types/enums.js";
import { Messages } from "../../../constants/messages.js";

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "entrez-job-"));
  path = join(dir, "job.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("createJob / getJob", () => {
  it("writes a QUEUED record that round-trips via getJob", async () => {
    const created = await createJob(
      { query: "crispr" },
      { id: "job-1", nowMs: 1_000, path },
    );

    expect(created.status).toBe(JobStatus.QUEUED);
    expect(created.createdAt).toBe(created.updatedAt);

    const loaded = await getJob("job-1", { path });
    expect(loaded).toEqual(created);
  });

  it("returns null when the job file is missing", async () => {
    expect(await getJob("missing", { path })).toBeNull();
  });

  it("generates a job id when none is provided", async () => {
    const created = await createJob({ query: "x" }, { nowMs: 1_000, path });
    expect(created.jobId).toMatch(/.+/);
    expect((await getJob(created.jobId, { path }))?.jobId).toBe(created.jobId);
  });
});

describe("updateJob", () => {
  it("transitions QUEUED -> RUNNING -> SUCCEEDED and bumps updatedAt", async () => {
    await createJob({ query: "x" }, { id: "job-2", nowMs: 1_000, path });

    const running = await updateJob(
      "job-2",
      { status: JobStatus.RUNNING },
      { nowMs: 2_000, path },
    );
    expect(running.status).toBe(JobStatus.RUNNING);
    expect(running.updatedAt).not.toBe(running.createdAt);

    const done = await updateJob(
      "job-2",
      { status: JobStatus.SUCCEEDED },
      { nowMs: 3_000, path },
    );
    expect(done.status).toBe(JobStatus.SUCCEEDED);
    expect(done.createdAt).toBe(running.createdAt);
    expect(done.updatedAt).not.toBe(running.updatedAt);
  });

  it("throws JOB_NOT_FOUND when the job is missing", async () => {
    await expect(
      updateJob("ghost", { status: JobStatus.FAILED }, { path }),
    ).rejects.toThrow(Messages.JOB_NOT_FOUND);
  });
});

describe("pollResults", () => {
  it("returns status and progress when no result is present", async () => {
    await createJob({ query: "x" }, { id: "job-3", nowMs: 1_000, path });
    const progress = { fetched: 2, total: 10, segments: 1 };
    await updateJob(
      "job-3",
      { status: JobStatus.RUNNING, progress },
      { nowMs: 2_000, path },
    );

    const poll = await pollResults("job-3", { path });
    expect(poll.status).toBe(JobStatus.RUNNING);
    expect(poll.progress).toEqual(progress);
    expect(poll.cursor).toBeUndefined();
  });

  it("paginates union.records and emits a cursor only while more remain", async () => {
    const records = Array.from({ length: 5 }, (_, i) => ({ pmid: String(i) }));
    await createJob({ query: "x" }, { id: "job-4", nowMs: 1_000, path });
    await updateJob(
      "job-4",
      { status: JobStatus.SUCCEEDED, result: { union: { records } } },
      { nowMs: 2_000, path },
    );

    const first = await pollResults("job-4", { pageSize: 2, path });
    expect(
      (first.result as { union: { records: unknown[] } }).union.records,
    ).toHaveLength(2);
    expect(first.cursor).toBe("2");

    const last = await pollResults("job-4", { cursor: "4", pageSize: 2, path });
    expect(
      (last.result as { union: { records: unknown[] } }).union.records,
    ).toHaveLength(1);
    expect(last.cursor).toBeUndefined();
  });

  it("passes a non-paginatable result through unchanged", async () => {
    await createJob({ query: "x" }, { id: "job-5", nowMs: 1_000, path });
    await updateJob(
      "job-5",
      { status: JobStatus.SUCCEEDED, result: { summary: "done" } },
      { nowMs: 2_000, path },
    );
    const poll = await pollResults("job-5", { path });
    expect(poll.result).toEqual({ summary: "done" });
    expect(poll.cursor).toBeUndefined();
  });
});
