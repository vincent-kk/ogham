import type {
  McpServerManager,
  McpServerManagerOptions,
} from "../types/mcp.js";
import { validateMcpOwner } from "./planning/validateMcpOwner.js";
import { claudeProjectJson } from "./adapters/claudeProjectJson.js";
import { claudeUserCli } from "./adapters/claudeUserCli.js";
import { codexProjectToml } from "./adapters/codexProjectToml.js";
import { codexUserCli } from "./adapters/codexUserCli.js";

export function createMcpServerManager(
  options: McpServerManagerOptions,
): McpServerManager {
  const ownerError = validateMcpOwner(options.owner);
  if (ownerError !== null) throw new Error(ownerError);
  if (options.target.kind === "json-file") return claudeProjectJson(options);
  if (options.target.kind === "toml-file") return codexProjectToml(options);
  if (options.target.kind === "cli") {
    if (options.target.command === "claude") return claudeUserCli(options);
    if (options.target.command === "codex") return codexUserCli(options);
  }
  throw new Error("Unsupported MCP target");
}
