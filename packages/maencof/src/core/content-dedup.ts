/**
 * @file content-dedup.ts
 * @description Content deduplication — removes duplicate frontmatter/H1 from user-provided content
 *              before assembly with auto-generated frontmatter and title.
 *
 * Pure function: no file I/O, string in → string out.
 */

import { parseYamlFrontmatter } from './yaml-parser.js';

/** Frontmatter delimiter regex (content must start with ---) */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** H1 heading regex (must be the first non-empty line) */
const H1_REGEX = /^#\s+(.+)$/m;

/** Result of deduplication with optional warnings */
export interface DeduplicateResult {
  /** Cleaned content */
  content: string;
  /** Warnings about what was removed */
  warnings: string[];
}

/**
 * Removes structural duplicates from user-provided content before it is
 * combined with auto-generated frontmatter and title.
 *
 * Removal rules (applied in order):
 * 1. If content starts with a frontmatter block (---...---) whose keys
 *    overlap with `generatedKeys`, the entire block is removed.
 * 2. If content starts with an H1 heading (`# ...`) that exactly matches
 *    the provided `title`, the heading line is removed.
 * 3. Leading blank lines are trimmed.
 *
 * Conservative policy: only exact matches trigger removal.
 * On any ambiguity, the original content is preserved.
 */
export function deduplicateContent(
  content: string,
  options: {
    title?: string;
    generatedKeys: string[];
  },
): DeduplicateResult {
  const warnings: string[] = [];

  if (!content) {
    return { content: '', warnings };
  }

  let result = content;

  // Step 1: Remove duplicate frontmatter block
  result = removeDuplicateFrontmatter(result, options.generatedKeys, warnings);

  // Step 1.5: Remove loose key: value lines at start of content
  result = removeLooseMetadataLines(result, options.generatedKeys, warnings);

  // Step 2: Remove duplicate H1 heading
  result = removeDuplicateH1(result, options.title, warnings);

  // Step 3: Trim leading blank lines
  result = result.replace(/^\n+/, '');

  return { content: result, warnings };
}

/**
 * Removes a frontmatter block from the start of content if its keys
 * overlap with the generated frontmatter keys.
 *
 * "Overlap" means at least one key in the content's frontmatter exists
 * in the generated keys list. This is conservative enough because
 * legitimate user content rarely starts with a `---` YAML block containing
 * keys like `created`, `tags`, or `layer`.
 */
function removeDuplicateFrontmatter(
  content: string,
  generatedKeys: string[],
  warnings: string[],
): string {
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) return content;

  const yamlBlock = match[1];
  const parsed = parseYamlFrontmatter(yamlBlock);
  const contentKeys = Object.keys(parsed);

  const overlapping = contentKeys.filter((k) => generatedKeys.includes(k));
  if (overlapping.length === 0) return content;

  warnings.push(
    `Duplicate frontmatter removed from content (overlapping keys: ${overlapping.join(', ')})`,
  );
  return content.slice(match[0].length);
}

/**
 * Removes loose `key: value` lines at the start of content where the key
 * matches one of the generated keys. Stops at the first blank line or
 * non-matching line (conservative policy).
 */
function removeLooseMetadataLines(
  content: string,
  generatedKeys: string[],
  warnings: string[],
): string {
  const lines = content.split('\n');
  const removedKeys: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Stop at blank line or non key:value line
    const kvMatch = /^([a-zA-Z_][a-zA-Z0-9_]*):\s/.exec(line);
    if (!kvMatch) break;

    if (generatedKeys.includes(kvMatch[1])) {
      removedKeys.push(kvMatch[1]);
      i++;
    } else {
      break;
    }
  }

  if (removedKeys.length === 0) return content;

  warnings.push(
    `Loose metadata lines removed from content (keys: ${removedKeys.join(', ')})`,
  );
  return lines.slice(i).join('\n');
}

/**
 * Removes an H1 heading from the start of content (after optional blank lines)
 * if it exactly matches the provided title.
 */
function removeDuplicateH1(
  content: string,
  title: string | undefined,
  warnings: string[],
): string {
  if (!title) return content;

  const match = H1_REGEX.exec(content);
  if (!match) return content;

  // Only remove if the H1 is at the very start (ignoring leading whitespace)
  const beforeMatch = content.slice(0, match.index).trim();
  if (beforeMatch) return content;

  const headingText = match[1].trim();
  if (headingText !== title) return content;

  warnings.push(`Duplicate H1 heading removed from content: "${title}"`);

  // Remove the H1 line and the immediately following blank line(s)
  const afterH1 = content.slice(match.index + match[0].length);
  return afterH1;
}
