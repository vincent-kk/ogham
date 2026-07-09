/**
 * @file shouldCommitOnPrompt.ts
 * @description Decide whether a UserPromptSubmit prompt should trigger a vault commit.
 */
import { DEFAULT_SKIP_PATTERN_SOURCE } from '../../../../constants/vaultCommitter.js';
import type { VaultCommitConfig } from '../types/types.js';

/**
 * Compile the configured skip patterns with case-insensitive matching.
 * Invalid regex sources are silently dropped so one bad entry can never
 * disable the whole trigger.
 */
function compileSkipPatterns(sources: readonly string[]): RegExp[] {
  const result: RegExp[] = [];
  for (const source of sources)
    try {
      result.push(new RegExp(source, 'i'));
    } catch {
      // malformed regex — skip silently (error-log already captures it upstream
      // when the config reader fails to parse a non-string entry)
    }

  return result;
}

/**
 * Decide whether a UserPromptSubmit prompt should trigger vault commit.
 * A match on `config.skip_patterns` (naming caveat — see VaultCommitConfig)
 * means COMMIT NOW; no match means this prompt does not trigger the committer.
 * Falls back to the `/clear` trigger via `DEFAULT_SKIP_PATTERN_SOURCE`.
 */
export function shouldCommitOnPrompt(
  prompt: string,
  config: VaultCommitConfig | null,
): boolean {
  const sources =
    config?.skip_patterns && config.skip_patterns.length > 0
      ? config.skip_patterns
      : [DEFAULT_SKIP_PATTERN_SOURCE];
  const patterns = compileSkipPatterns(sources);
  return patterns.some((p) => p.test(prompt));
}
