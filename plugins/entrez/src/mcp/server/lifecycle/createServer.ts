import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { VERSION } from "../../../version.js";
import {
  PaperSearchInputSchema,
  PaperSearchStatusInputSchema,
  PaperSearchResultsInputSchema,
  MeshLookupInputSchema,
  FetchFulltextInputSchema,
  AuthCheckInputSchema,
  type PaperSearchInput,
  type MeshLookupInput,
  type FetchFulltextInput,
  type AuthCheckInput,
} from "../../../types/tool.js";
import { SetupInputSchema, type SetupParams } from "../../../types/setup.js";
import { wrapHandler, buildToolContext } from "../../shared/index.js";
import { handleSetup } from "../../tools/setup/index.js";
import {
  runPaperSearch,
  startJob,
  pollJob,
  readJob,
} from "../../tools/paperSearch/index.js";
import { runMeshLookup } from "../../tools/meshLookup/index.js";
import { runFetchFulltext } from "../../tools/fetchFulltext/index.js";
import { runAuthCheck } from "../../tools/authCheck/index.js";

const SERVER_NAME = "entrez";
const INTERNAL =
  "[Internal] Do not call directly. Used by entrez skills/agent only.";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;
const READ_VOLATILE = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
} as const;
const WRITE_IDEMPOTENT = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
} as const;
const WRITE_VOLATILE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
} as const;

/**
 * Create and configure the entrez MCP server with all tool registrations:
 * paper-search (+ async start/status/results), mesh-lookup, fetch-fulltext,
 * auth-check. (setup is registered in Phase 6 alongside the web UI.)
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: VERSION });

  server.registerTool(
    "paper-search",
    {
      description: `${INTERNAL} Recall-first PubMed search: multi-role query union with deterministic dedup.`,
      inputSchema: PaperSearchInputSchema,
      annotations: READ_VOLATILE,
    },
    wrapHandler(async (args: PaperSearchInput) =>
      runPaperSearch(args, await buildToolContext()),
    ),
  );

  server.registerTool(
    "paper-search-start",
    {
      description: `${INTERNAL} Start a large async paper-search job; returns a jobId.`,
      inputSchema: PaperSearchInputSchema,
      annotations: WRITE_VOLATILE,
    },
    wrapHandler(async (args: PaperSearchInput) =>
      startJob(args, await buildToolContext()),
    ),
  );

  server.registerTool(
    "paper-search-status",
    {
      description: `${INTERNAL} Poll an async paper-search job's status/progress.`,
      inputSchema: PaperSearchStatusInputSchema,
      annotations: READ_ONLY,
    },
    wrapHandler(async (args: { jobId: string }) => pollJob(args.jobId)),
  );

  server.registerTool(
    "paper-search-results",
    {
      description: `${INTERNAL} Read a completed async paper-search job (cursor paginated).`,
      inputSchema: PaperSearchResultsInputSchema,
      annotations: READ_ONLY,
    },
    wrapHandler(async (args: { jobId: string; cursor?: string }) =>
      readJob(args.jobId, args.cursor),
    ),
  );

  server.registerTool(
    "mesh-lookup",
    {
      description: `${INTERNAL} Map terms to MeSH descriptors (db=mesh).`,
      inputSchema: MeshLookupInputSchema,
      annotations: READ_ONLY,
    },
    wrapHandler(async (args: MeshLookupInput) =>
      runMeshLookup(args, await buildToolContext()),
    ),
  );

  server.registerTool(
    "fetch-fulltext",
    {
      description: `${INTERNAL} Download PMC Open Access full text (OA + license gated).`,
      inputSchema: FetchFulltextInputSchema,
      annotations: WRITE_IDEMPOTENT,
    },
    wrapHandler(async (args: FetchFulltextInput) =>
      runFetchFulltext(args, await buildToolContext()),
    ),
  );

  server.registerTool(
    "auth-check",
    {
      description: `${INTERNAL} Report config state, EInfo reachability, and rate limit.`,
      inputSchema: AuthCheckInputSchema,
      annotations: READ_ONLY,
    },
    wrapHandler(async (args: AuthCheckInput) => runAuthCheck(args)),
  );

  server.registerTool(
    "setup",
    {
      description: `${INTERNAL} Launch the local web UI to configure tool/email/api_key.`,
      inputSchema: SetupInputSchema,
      annotations: WRITE_VOLATILE,
    },
    wrapHandler(async (args: SetupParams) => handleSetup(args)),
  );

  return server;
}
