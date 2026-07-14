/**
 * Agent host running the plugin. `unknown` covers an `OGHAM_HOST` marker this
 * build does not recognise — treated conservatively (no coordinate is guessed).
 */
export type Host = "claude" | "codex" | "agy" | "unknown";
