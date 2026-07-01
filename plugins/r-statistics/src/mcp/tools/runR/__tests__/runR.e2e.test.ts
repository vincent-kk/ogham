import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { discoverRscript } from "../../../../core/index.js";
import { McpToolName } from "../../../../constants/mcpToolNames.js";
import { JobStatus, RErrorCode } from "../../../../types/enums.js";
import type { RunROutput } from "../../../../types/rExecution.js";
import { handleGetRJob } from "../../getRJob/index.js";
import { handleRunR } from "../runR.js";

// Resolve the real plugin root so the wrapper can source shared/contract.R.
const pluginRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);
const hasR = discoverRscript() !== null;

const DEMO_SCRIPT = `
df <- data.frame(group = c("a","a","a","b","b","b"), value = c(1.1,2.0,1.5,3.3,4.4,3.9))
res <- t.test(value ~ group, data = df)
cat("t =", round(res$statistic, 3), " p =", round(res$p.value, 4), "\\n")
utils::write.csv(df, artifact_path("demo.csv"), row.names = FALSE)
add_artifact("data.demo", "data", "demo.csv", "demo dataset")
`;

async function poll(jobId: string): Promise<RunROutput> {
  for (let i = 0; i < 50; i += 1) {
    const out = await handleGetRJob({ jobId });
    if (out.status !== JobStatus.Running && out.status !== JobStatus.Queued)
      return out;

    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("job did not finish in time");
}

describe(McpToolName.RUN_R, () => {
  beforeAll(() => {
    process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  });

  it("rejects an empty script", async () => {
    await expect(handleRunR({ scriptCode: "  " })).rejects.toThrow();
  });

  it("blocks a forbidden call without executing", async () => {
    const out = await handleRunR({ scriptCode: 'system("ls")' });
    expect(out.status).toBe(JobStatus.Failed);
    expect(out.result?.error?.code).toBe(RErrorCode.CommandBlocked);
  });

  it.skipIf(!hasR)(
    "executes a real script synchronously and collects an artifact",
    async () => {
      const out = await handleRunR({
        scriptCode: DEMO_SCRIPT,
        executionMode: "sync",
      });
      expect(out.status).toBe(JobStatus.Succeeded);
      expect(out.result?.exitCode).toBe(0);
      expect(out.result?.stdout.text).toContain("p =");
      const csv = out.result?.artifacts.find((a) =>
        a.path.endsWith("demo.csv"),
      );
      expect(csv).toBeDefined();
      expect(csv?.sha256).toHaveLength(64);
      expect(csv?.kind).toBe("data");
    },
  );

  it.skipIf(!hasR)(
    "runs asynchronously and reaches a terminal status via polling",
    async () => {
      const started = await handleRunR({ scriptCode: DEMO_SCRIPT });
      expect(started.status).toBe(JobStatus.Running);
      const finished = await poll(started.jobId);
      expect(finished.status).toBe(JobStatus.Succeeded);
      expect(finished.result?.artifacts.length).toBeGreaterThan(0);
    },
  );

  it.skipIf(!hasR)(
    "workspace_files persists artifacts across calls; stateless resets them",
    async () => {
      const workspaceId = "ws_persist_e2e";
      const writeA =
        'utils::write.csv(data.frame(x=1), artifact_path("a.csv"), row.names=FALSE)\n' +
        'add_artifact("a", "data", "a.csv", "first")';
      const writeB =
        'utils::write.csv(data.frame(x=2), artifact_path("b.csv"), row.names=FALSE)\n' +
        'add_artifact("b", "data", "b.csv", "second")';

      await handleRunR({
        scriptCode: writeA,
        workspaceId,
        sessionMode: "workspace_files",
        executionMode: "sync",
      });
      const persisted = await handleRunR({
        scriptCode: writeB,
        workspaceId,
        sessionMode: "workspace_files",
        executionMode: "sync",
      });
      const persistedNames = (persisted.result?.artifacts ?? [])
        .map((a) => a.path)
        .join(",");
      expect(persistedNames).toContain("a.csv"); // carried over from call 1
      expect(persistedNames).toContain("b.csv");

      const reset = await handleRunR({
        scriptCode: writeB,
        workspaceId,
        sessionMode: "stateless",
        executionMode: "sync",
      });
      const resetNames = (reset.result?.artifacts ?? [])
        .map((a) => a.path)
        .join(",");
      expect(resetNames).not.toContain("a.csv"); // stateless wiped the workspace
      expect(resetNames).toContain("b.csv");
    },
  );
});
