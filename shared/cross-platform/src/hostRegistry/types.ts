/**
 * Agent host running the plugin. `unknown` covers a host marker this build does
 * not recognise — treated conservatively (no coordinate is guessed).
 */
export type Host = "claude" | "codex" | "agy" | "unknown";

/**
 * The hosts the registry actually describes. `unknown` is excluded on purpose: it
 * is the absence of a match, not a host, and giving it a row would invite callers
 * to read coordinates off a host that was never identified.
 */
export type KnownHost = Exclude<Host, "unknown">;

/**
 * Everything this codebase knows about one host, as data.
 *
 * The point of the descriptor is that host names and host env-var names appear
 * here and nowhere else: consumers ask the table what a host's coordinates are
 * instead of branching on its identity. Adding a host is a new row, not a new
 * `if` in whichever module happened to need the answer first.
 *
 * Absent signals are absent fields rather than explicit nulls — the table reads as
 * "what this host provides", and every field it carries is one the host actually has.
 */
export interface HostDescriptor {
  /**
   * Value the adapters write into the host-marker env var. Omitted when the host
   * ships no marker at all — Claude's `.mcp.json` is the unmodified canon, so its
   * absence is the signal.
   */
  readonly marker?: string;
  /** Env var a user can set to relocate this host's root. */
  readonly stateRootEnv: string;
  /** Directory under `$HOME` used when `stateRootEnv` is unset. */
  readonly stateRootDir: string;
  /**
   * Env var the host injects into hook processes but NOT into MCP processes —
   * usable as a hook-side discriminator, because hooks never receive the marker.
   * Omitted when the host offers no such signal.
   */
  readonly hookSignalEnv?: string;
}
