import { SOURCE_EXTENSIONS } from '../../../adapters/index.js';

/**
 * The facts scope a project gets when its config declares none.
 *
 * A default rather than a config write. The server must not edit a project's
 * `.filid/config.json`: bootstrap runs inside reviews and pipelines, and a tool
 * that repaired config on the way would dirty the worktree mid-review — the one
 * step added to avoid calling a human would be the step that calls one.
 *
 * The globs are derived from the extensions the adapters already publish, so
 * the default scope is exactly the set those adapters analyse today and nothing
 * narrows by adopting facts. The conventions pack takes this over later, at
 * which point the import disappears rather than moving.
 *
 * @returns Source-extension globs, sorted so the value is stable to compare.
 */
export function defaultFactsCovers(): string[] {
  return [...SOURCE_EXTENSIONS]
    .map((extension) => `**/*${extension}`)
    .sort((left, right) => left.localeCompare(right));
}
