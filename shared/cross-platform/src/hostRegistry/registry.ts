import type { HostDescriptor, KnownHost } from "./types.js";

/** Env var the non-Claude adapters inject into their MCP declaration. */
export const HOST_MARKER_ENV = "OGHAM_HOST";

/**
 * Where each host keeps its own root, named one channel per host.
 *
 * Extracted rather than written inline so every row of the table below reads the
 * same way — marker, channel, optional hook signal — and so a borrowed channel is
 * literally the lender's constant: `CLAUDE_STATE_CHANNEL` appearing in another
 * host's row cannot silently drift away from what Claude itself uses.
 */
const CLAUDE_STATE_CHANNEL = {
  stateRootEnv: "CLAUDE_CONFIG_DIR",
  stateRootDir: ".claude",
} as const;

const CODEX_STATE_CHANNEL = {
  stateRootEnv: "CODEX_HOME",
  stateRootDir: ".codex",
} as const;

/**
 * The hosts this build knows, and where each keeps plugin state.
 *
 * `hookSignalEnv` is measured, not assumed. Codex injects an un-prefixed
 * `PLUGIN_DATA` into hook processes ("OOTB compat", `hooks/engine/discovery.rs`);
 * Claude injects only `CLAUDE_`-prefixed variants — a `--plugin-dir` probe of a
 * SessionStart hook returned `CLAUDE_PLUGIN_ROOT` and `CLAUDE_PLUGIN_DATA` and no
 * un-prefixed pair. That asymmetry is the whole basis for reading `PLUGIN_DATA` as
 * "this is Codex", so it lives here as data rather than inline in a path helper.
 *
 * agy borrows Claude's channel deliberately: no agy state directory has been
 * measured, and inventing one would move state to a path nothing reads. The row
 * exists so the borrow is a decision on the table rather than a branch nobody wrote.
 *
 * This table is bundled into hook processes, so rows stay lean — a field here is
 * paid for on every hook cold start.
 */
export const HOSTS: Readonly<Record<KnownHost, HostDescriptor>> = {
  claude: { ...CLAUDE_STATE_CHANNEL },
  codex: {
    marker: "codex",
    ...CODEX_STATE_CHANNEL,
    hookSignalEnv: "PLUGIN_DATA",
  },
  agy: { marker: "agy", ...CLAUDE_STATE_CHANNEL },
};
