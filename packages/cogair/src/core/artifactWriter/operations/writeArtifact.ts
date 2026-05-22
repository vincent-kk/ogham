import { atomicWrite } from '../../../lib/atomicWrite.js';
import { logger } from '../../../lib/logger.js';
import type { ArtifactsConfig, Provider } from '../../../types/index.js';
import { renderMarkdown } from '../utils/renderMarkdown.js';
import { resolveArtifactPath } from '../utils/resolveArtifactPath.js';

export interface WriteArtifactArgs {
  artifacts: ArtifactsConfig;
  cwd: string;
  projectHash: string;
  sessionId: string;
  turn: number;
  provider: Provider;
  model: string;
  createdAt: string;
  elapsedMs: number;
  prompt: string;
  response: string;
}

export async function writeArtifact(
  args: WriteArtifactArgs,
): Promise<string | undefined> {
  try {
    const path = resolveArtifactPath({
      location: args.artifacts.location,
      cwd: args.cwd,
      projectHash: args.projectHash,
      sessionId: args.sessionId,
      turn: args.turn,
    });
    const markdown = renderMarkdown({
      sessionId: args.sessionId,
      provider: args.provider,
      model: args.model,
      turn: args.turn,
      createdAt: args.createdAt,
      elapsedMs: args.elapsedMs,
      prompt: args.prompt,
      response: args.response,
    });
    await atomicWrite(path, markdown);
    return path;
  } catch (err) {
    logger.warn(
      'artifact write failed',
      err instanceof Error ? err.message : err,
    );
    return undefined;
  }
}
