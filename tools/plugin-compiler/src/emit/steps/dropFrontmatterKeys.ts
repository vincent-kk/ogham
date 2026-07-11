const FRONTMATTER = /^(---\n)([\s\S]*?)(\n---\n)/;
const KEY = /^([A-Za-z0-9_-]+):/;

/**
 * Remove the given top-level scalar keys from a SKILL.md frontmatter block,
 * line by line — never reserializing, so all other formatting is preserved.
 * Used to strip Claude-only keys (`user_invocable`, `argument-hint`) for hosts
 * that ignore them. No frontmatter → text returned unchanged.
 */
export function dropFrontmatterKeys(
  text: string,
  keys: readonly string[],
): string {
  if (!keys.length) return text;
  const m = text.match(FRONTMATTER);
  if (!m) return text;

  const [whole, open, body, close] = m;
  const drop = new Set(keys);
  const kept = body.split("\n").filter((line) => {
    const key = line.match(KEY)?.[1];
    return !(key && drop.has(key));
  });
  return open + kept.join("\n") + close + text.slice(whole.length);
}
