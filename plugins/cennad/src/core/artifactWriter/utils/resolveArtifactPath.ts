import { artifactPath } from '../../../constants/paths.js';
import type { ArtifactLocation } from '../../../types/index.js';

export interface ResolveArtifactPathArgs {
  location: ArtifactLocation;
  cwd: string;
  projectHash: string;
  sessionId: string;
  turn: number;
}

export function resolveArtifactPath(args: ResolveArtifactPathArgs): string {
  return artifactPath(
    args.location,
    args.cwd,
    args.projectHash,
    args.sessionId,
    args.turn,
  );
}
