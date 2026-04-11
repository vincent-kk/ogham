import { initProject } from '../../../core/infra/config-loader/config-loader.js';
import type { InitResult } from '../../../core/infra/config-loader/config-loader.js';

export interface ProjectInitInput {
  path: string;
}

/**
 * Handle project_init MCP tool calls.
 *
 * Initializes FCA-AI project infrastructure — config only:
 * - Creates .filid/config.json with default rule configuration.
 *
 * Rule doc deployment (`.claude/rules/*.md`) is NOT performed here; the
 * filid-setup skill drives that through the rule_docs_sync tool so users
 * always make an explicit checkbox choice about optional rule files.
 *
 * Existing config.json is never overwritten.
 */
export function handleProjectInit(args: unknown): InitResult {
  const input = args as ProjectInitInput;

  if (!input.path) {
    throw new Error('path is required');
  }

  return initProject(input.path);
}
