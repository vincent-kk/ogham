/**
 * @file constants/files.ts
 * @description Filename and path constants for .imbas/ directory structure
 */

/** Root directory name for imbas workspace */
export const IMBAS_ROOT_DIRNAME = '.imbas';

/** Filename for run state persistence */
export const STATE_FILENAME = 'state.json';

/** Filename for project configuration */
export const CONFIG_FILENAME = 'config.json';

/** Filename for cache timestamp tracking */
export const CACHED_AT_FILENAME = 'cached_at.json';

/** Filename for source document in run directory */
export const SOURCE_FILENAME = 'source.md';

/** Directory name for supplementary files */
export const SUPPLEMENTS_DIRNAME = 'supplements';

/** Special source identifier for devplan-pipeline mode */
export const DEVPLAN_PIPELINE_SOURCE = 'devplan-pipeline';

/** Directory name for runs */
export const RUNS_DIRNAME = 'runs';

/** Debug log filename */
export const DEBUG_LOG_FILENAME = 'debug.log';

/** Manifest file mapping by type */
export const MANIFEST_FILE_MAP = {
  stories: 'stories-manifest.json',
  devplan: 'devplan-manifest.json',
  'implement-plan': 'implement-plan.json',
} as const;

/** Report file mapping by manifest type */
export const REPORT_FILE_MAP = {
  'implement-plan': 'implement-plan-report.md',
} as const;

/** Cache file mapping by type */
export const CACHE_FILE_MAP: Record<string, string> = {
  'project-meta': 'project-meta.json',
  'issue-types': 'issue-types.json',
  'link-types': 'link-types.json',
  'workflows': 'workflows.json',
};
