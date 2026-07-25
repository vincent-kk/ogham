import { createInstructionSectionManager } from "../instructions/index.js";
import { createMcpServerManager } from "../mcp/index.js";
import { createRuleDocumentManager } from "../rules/index.js";
import { resolveUserTargets } from "../targets/index.js";
import type { UserArtifactManagerOptions } from "../types/artifacts.js";
import type { ArtifactManager } from "../types/managers.js";
import { requireArtifactOwner } from "../validation/index.js";

export function createUserArtifactManager(
  options: UserArtifactManagerOptions,
): ArtifactManager {
  const owner = requireArtifactOwner(options.owner);
  const targets = resolveUserTargets({ host: options.host });

  return {
    rules: createRuleDocumentManager({ owner, target: targets.rules }),
    instructions: createInstructionSectionManager({
      owner,
      target: targets.instructions,
    }),
    mcp: createMcpServerManager({ owner, target: targets.mcp }),
  };
}
