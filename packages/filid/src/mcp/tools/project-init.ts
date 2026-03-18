import { initProject } from '../../core/infra/config-loader.js';
import type { InitResult } from '../../core/infra/config-loader.js';

export interface ProjectInitInput {
  path: string;
}

/**
 * Handle project_init MCP tool calls.
 *
 * Initializes FCA-AI project infrastructure:
 * - Creates .filid/config.json with default rule configuration
 * - Copies templates/rules/fca.md to .claude/rules/fca.md
 *
 * Existing files are never overwritten.
 */
export function handleProjectInit(args: unknown): InitResult {
  const input = args as ProjectInitInput;

  if (!input.path) {
    throw new Error('path is required');
  }

  return initProject(input.path);
}
