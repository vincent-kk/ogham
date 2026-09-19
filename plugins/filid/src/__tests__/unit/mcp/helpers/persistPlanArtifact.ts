import { McpToolName } from '../../../../constants/mcpToolNames.js';
import { persistToolArtifact } from '../../../../core/infra/artifactStore/utils/persistToolArtifact.js';

/**
 * Store a hand-built plan artifact the way the server stores its own: in the
 * restructure artifact store, named by the sha256 of its content.
 *
 * Tests use it to reach the reader's inner defenses (schema, containment) with
 * content the server did not write; digest-named storage is the forgery the
 * trust check leaves out of scope.
 * @param artifact Bare plan or persisted plan payload.
 * @returns Absolute path of the stored artifact.
 */
export function persistPlanArtifact(artifact: unknown): string {
  return persistToolArtifact(McpToolName.RESTRUCTURE, JSON.stringify(artifact))
    .path;
}
