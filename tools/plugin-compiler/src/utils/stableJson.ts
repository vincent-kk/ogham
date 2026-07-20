/** Canonical JSON: 2-space indent + trailing newline, matching `scripts/injectVersion.mjs`. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}
