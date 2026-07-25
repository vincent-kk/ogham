import type { ArtifactOutcome, ArtifactPlan } from "./artifacts.js";
import type { CliMcpTarget, FileMcpTarget } from "../targets/index.js";

export type McpServerDefinition =
  | {
      readonly transport: "stdio";
      readonly command: string;
      readonly args?: readonly string[];
      readonly env?: Readonly<Record<string, string>>;
    }
  | {
      readonly transport: "http";
      readonly url: string;
      readonly bearerTokenEnvVar?: string;
      readonly headers?: Readonly<Record<string, string>>;
    };

export interface McpServerRequest {
  readonly name: string;
  readonly definition: McpServerDefinition | null;
  readonly replaceDrift: boolean;
}

export type McpFailureKind =
  | "not-installed"
  | "spawn"
  | "timeout"
  | "exit"
  | "conflict"
  | "invalid";

export interface McpFailure {
  readonly kind: McpFailureKind;
  readonly code: number | null;
  readonly stderr: string;
}

export interface McpPlanFailure {
  readonly kind: "conflict" | "invalid";
  readonly reason: string;
}

export interface McpServerPlan extends ArtifactPlan<McpServerRequest> {
  readonly failure?: McpPlanFailure;
}

export interface McpCliRunResult {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly spawnError?: Error;
}

export type McpCliRunner = (
  binary: string,
  args: readonly string[],
) => Promise<McpCliRunResult>;

export interface McpApplyOptions {
  readonly runner?: McpCliRunner;
}

export interface McpServerApplyResult {
  readonly ok: boolean;
  readonly outcomes: readonly ArtifactOutcome[];
  readonly revisions: McpServerPlan["revisions"];
  readonly failure?: McpFailure;
}

export interface McpServerManagerOptions {
  readonly owner: string;
  readonly target: FileMcpTarget | CliMcpTarget;
}

export interface McpServerManager {
  inspect(name: string): Promise<readonly ArtifactOutcome[]>;
  plan(request: McpServerRequest): Promise<McpServerPlan>;
  apply(
    plan: McpServerPlan,
    options?: McpApplyOptions,
  ): Promise<McpServerApplyResult>;
}
