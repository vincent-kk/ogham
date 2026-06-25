import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  AssumptionId,
  DataFormat,
  Encoding,
  ExecutionMode,
  MethodFamily,
  OutcomeType,
  RunMode,
} from "../../../types/enums.js";
import { VERSION } from "../../../version.js";
import { wrapHandler } from "../../shared/index.js";
import {
  handleAssertAnalysisPlan,
  handleCancelRJob,
  handleGetRJob,
  handleRunR,
} from "../../tools/index.js";

const dataRefSchema = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .describe(
      "Stable id user code references this dataset by (no path separators).",
    ),
  format: z.nativeEnum(DataFormat).describe("On-disk format of the dataset."),
  path: z
    .string()
    .describe("Absolute path the MCP resolves and copies into the workspace."),
  encoding: z
    .nativeEnum(Encoding)
    .optional()
    .describe("Source encoding (UTF-8 default; CP949/EUC-KR for Korean data)."),
  sha256: z.string().optional().describe("Optional integrity hash."),
});

const methodSchema = z.object({
  technique: z.string().describe("Method id, e.g. t_test, linear_regression."),
  family: z.nativeEnum(MethodFamily).describe("Statistical method family."),
  paired: z.boolean().optional().describe("Paired/repeated-measures design."),
});

const datasetMetaSchema = z.object({
  outcomeType: z
    .nativeEnum(OutcomeType)
    .describe("Type of the dependent variable."),
  groupCount: z
    .number()
    .int()
    .optional()
    .describe("Number of compared groups."),
  sampleSize: z.number().int().optional().describe("Total observations."),
  expectedCountsBelow5: z
    .boolean()
    .optional()
    .describe("Chi-square: many expected cell counts < 5."),
  eventsPerVariable: z
    .number()
    .optional()
    .describe("Regression: events per predictor (EPV)."),
});

const assumptionArtifactSchema = z.object({
  assumptionId: z
    .nativeEnum(AssumptionId)
    .describe("Assumption id, e.g. normality, homogeneity."),
  artifactPath: z.string().describe("Path to the assumption-check artifact."),
  passed: z.boolean().describe("Whether the assumption check passed."),
});

/** Create the MCP "tools" server and register r-statistics' execution tools. */
export function createServer(): McpServer {
  const server = new McpServer({ name: "tools", version: VERSION });

  server.registerTool(
    "run_r",
    {
      description:
        "Execute R code in an isolated workspace via headless Rscript and " +
        "collect artifacts. Statically blocks unsafe calls; async by default " +
        "(poll with get_r_job). Execution safety only — not statistical policy.",
      inputSchema: {
        scriptCode: z
          .string()
          .describe("R code to run (written to a temp .R)."),
        dataRefs: z
          .array(dataRefSchema)
          .optional()
          .describe(
            "Input datasets the MCP resolves; user code never builds paths.",
          ),
        workspaceId: z
          .string()
          .regex(/^[A-Za-z0-9_-]+$/)
          .optional()
          .describe("Reuse an existing workspace for session isolation."),
        executionMode: z
          .nativeEnum(RunMode)
          .optional()
          .describe("async (default, returns jobId) or sync (awaits result)."),
        timeoutMs: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Execution timeout (clamped to the allowed ceiling)."),
        seed: z
          .number()
          .int()
          .optional()
          .describe("RNG seed for set.seed (reproducibility)."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    wrapHandler(handleRunR),
  );

  server.registerTool(
    "get_r_job",
    {
      description:
        "Poll an async R job's status and (when finished) its result and " +
        "collected artifacts.",
      inputSchema: {
        jobId: z.string().describe("The jobId returned by run_r."),
        includeStdout: z
          .boolean()
          .optional()
          .describe("Set false to omit captured stdout/stderr text."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleGetRJob),
  );

  server.registerTool(
    "cancel_r_job",
    {
      description:
        "Cancel a running R job (terminates its Rscript process). Returns " +
        "cancelled / already_finished / not_found.",
      inputSchema: {
        jobId: z.string().describe("The jobId returned by run_r."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleCancelRJob),
  );

  server.registerTool(
    "assert_analysis_plan",
    {
      description:
        "Deterministic statistical gate: validates method ↔ outcome/assumption " +
        "fit from normalized fields. Hard rules always block; soft rules warn " +
        "(allowed in interactive, blocked in auto). No execution.",
      inputSchema: {
        method: methodSchema.describe("The chosen statistical method."),
        datasetMeta: datasetMetaSchema.describe("Normalized dataset facts."),
        assumptionArtifacts: z
          .array(assumptionArtifactSchema)
          .optional()
          .describe("Assumption-check results feeding the soft rules."),
        mode: z
          .nativeEnum(ExecutionMode)
          .describe("interactive (warn) or auto (strict reselect)."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    wrapHandler(handleAssertAnalysisPlan),
  );

  return server;
}
