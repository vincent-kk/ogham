/**
 * Serialize a value to canonical JSON: 2-space indent, trailing newline.
 * Matches `scripts/inject-version.mjs` (the repo's existing plugin.json writer),
 * so emitted manifests stay byte-stable and deterministic.
 */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}
