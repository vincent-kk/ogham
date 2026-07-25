import type { ArtifactHost, ArtifactScope } from "../../types/artifacts.js";

export interface ProjectTargetOptions {
  readonly host: ArtifactHost;
  readonly projectRoot: string;
}

export interface UserTargetOptions {
  readonly host: ArtifactHost;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface DirectoryRuleTarget {
  readonly kind: "directory";
  readonly root: string;
  readonly directoryPath: string;
  readonly lockTarget: string;
}

export interface SectionArtifactTarget {
  readonly kind: "sections";
  readonly root: string;
  readonly effectivePath: string;
  readonly candidatePaths: readonly string[];
  readonly placement: "existing-or-effective" | "effective";
  readonly lockTarget: string;
}

export interface FileMcpTarget {
  readonly kind: "json-file" | "toml-file";
  readonly root: string;
  readonly path: string;
  readonly lockTarget: string;
}

export interface CliMcpTarget {
  readonly kind: "cli";
  readonly command: "claude" | "codex";
  readonly scope: "user";
}

export interface ArtifactTargetSet {
  readonly scope: ArtifactScope;
  readonly host: ArtifactHost;
  readonly root: string;
  readonly rules: DirectoryRuleTarget | SectionArtifactTarget;
  readonly instructions: SectionArtifactTarget;
  readonly mcp: FileMcpTarget | CliMcpTarget;
}
