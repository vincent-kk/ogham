import type { ArtifactAction } from "../../types/artifacts.js";
import type {
  McpCliRunner,
  McpServerDefinition,
  McpServerRequest,
} from "../../types/mcp.js";
import type { CliMcpTarget, FileMcpTarget } from "../../targets/index.js";

export interface FileMcpAdapterContext {
  readonly owner: string;
  readonly target: FileMcpTarget;
}

export interface CliMcpAdapterContext {
  readonly owner: string;
  readonly target: CliMcpTarget;
  readonly buildArguments: (request: McpServerRequest) => readonly string[];
}

export interface ParsedClaudeProjectJson {
  readonly root: Readonly<Record<string, unknown>>;
  readonly servers: Readonly<Record<string, unknown>>;
}

export type ClaudeProjectJsonParseResult =
  | { readonly ok: true; readonly value: ParsedClaudeProjectJson }
  | { readonly ok: false; readonly reason: string };

export type CodexProjectTomlParseResult =
  | {
      readonly ok: true;
      readonly value: Readonly<Record<string, unknown>>;
    }
  | { readonly ok: false; readonly reason: string };

export interface McpFileDecision {
  readonly action: ArtifactAction;
  readonly reason?: string;
}

export type McpFileContentResult =
  | { readonly ok: true; readonly content: string }
  | { readonly ok: false; readonly reason: string };

export type McpCliArgumentBuilder = (
  request: McpServerRequest,
) => readonly string[];

export interface McpCliExecution {
  readonly runner: McpCliRunner;
  readonly binary: string;
  readonly args: readonly string[];
}

export interface McpComparableDefinition {
  readonly definition: McpServerDefinition;
  readonly encoded: Readonly<Record<string, unknown>>;
}
