import { createInstructionSectionManager } from "../instructions/index.js";
import { createMcpServerManager } from "../mcp/index.js";
import { createRuleDocumentManager } from "../rules/index.js";
import { resolveProjectTargets } from "../targets/index.js";
import type { ProjectArtifactManagerOptions } from "../types/artifacts.js";
import type { ArtifactManager } from "../types/managers.js";
import { requireArtifactOwner } from "../validation/index.js";

type AbsolutePathLiteral =
  | `/${string}`
  | `${string}:/${string}`
  | `${string}:\\${string}`
  | `\\\\${string}`
  | "~"
  | `~/${string}`;

type CheckedProjectOptions<TRoot extends string> = Omit<
  ProjectArtifactManagerOptions,
  "projectRoot"
> & {
  readonly projectRoot: TRoot &
    (string extends TRoot
      ? string
      : TRoot extends AbsolutePathLiteral
        ? string
        : never);
};

export function createProjectArtifactManager<const TRoot extends string>(
  options: CheckedProjectOptions<TRoot>,
): ArtifactManager {
  const owner = requireArtifactOwner(options.owner);
  const targets = resolveProjectTargets({
    host: options.host,
    projectRoot: options.projectRoot,
  });

  return {
    rules: createRuleDocumentManager({ owner, target: targets.rules }),
    instructions: createInstructionSectionManager({
      owner,
      target: targets.instructions,
    }),
    mcp: createMcpServerManager({ owner, target: targets.mcp }),
  };
}
