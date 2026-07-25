import type {
  McpCliRunner,
  McpCliRunResult,
  McpServerRequest,
} from "../../types/mcp.js";
import type { CliMcpAdapterContext } from "./adapterTypes.js";
import { classifyClaudeUserMcpResult } from "./classifyClaudeUserMcpResult.js";
import { toMcpCliFailure } from "./toMcpCliFailure.js";

const IDEMPOTENT_SUCCESS: McpCliRunResult = {
  code: 0,
  stdout: "",
  stderr: "",
  timedOut: false,
};

export async function runClaudeUserMcpRequest(
  context: CliMcpAdapterContext,
  request: McpServerRequest,
  runner: McpCliRunner,
): Promise<McpCliRunResult> {
  const result = await runner(
    context.target.command,
    context.buildArguments(request),
  );
  const state = classifyClaudeUserMcpResult(result, request.name);

  if (request.definition === null)
    return state === "missing" ? IDEMPOTENT_SUCCESS : result;
  if (state !== "existing") return result;
  if (!request.replaceDrift) return IDEMPOTENT_SUCCESS;

  const removalRequest: McpServerRequest = {
    ...request,
    definition: null,
  };
  const removal = await runner(
    context.target.command,
    context.buildArguments(removalRequest),
  );
  const removalFailure = toMcpCliFailure(removal);
  if (
    removalFailure !== null &&
    classifyClaudeUserMcpResult(removal, request.name) !== "missing"
  )
    return removal;

  return runner(context.target.command, context.buildArguments(request));
}
