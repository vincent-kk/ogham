import { COMMENT_PROFILES_PATH } from "../../../constants/index.js";
import { readJson } from "../../../lib/fileIo.js";
import {
  CommentProfileFileSchema,
  CommentProfileSchema,
} from "../../../types/index.js";
import type { CommentProfile } from "../../../types/index.js";

/** Profiles keyed by hostname plus the warnings produced while reading them. */
export interface LoadedCommentProfiles {
  sites: Map<string, CommentProfile>;
  warnings: string[];
}

/**
 * Read every site's profile, isolating failures per site.
 * @param path Profile file; defaults to the plugin data directory file.
 * @returns Valid profiles only. A missing file yields an empty map without a warning; an unreadable file, a wrong `schemaVersion` or an unparsable envelope yields an empty map with one warning; a single invalid site yields a warning for that site alone.
 */
export async function loadCommentProfiles(
  path: string = COMMENT_PROFILES_PATH,
): Promise<LoadedCommentProfiles> {
  const sites = new Map<string, CommentProfile>();
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = await readJson<unknown>(path, undefined, null);
  } catch (error) {
    warnings.push(
      `comment profile file unreadable (${path}): ${error instanceof Error ? error.message : String(error)}`,
    );
    return { sites, warnings };
  }
  if (raw === null) return { sites, warnings };

  const envelope = CommentProfileFileSchema.safeParse(raw);
  if (!envelope.success) {
    warnings.push(
      `comment profile file ignored (${path}): ${envelope.error.issues[0]?.message ?? "invalid envelope"}`,
    );
    return { sites, warnings };
  }
  for (const [hostname, value] of Object.entries(envelope.data.sites)) {
    const parsed = CommentProfileSchema.safeParse(value);
    if (parsed.success) sites.set(hostname, parsed.data);
    else
      warnings.push(
        `comment profile for ${hostname} ignored: ${parsed.error.issues[0]?.message ?? "invalid"}`,
      );
  }
  return { sites, warnings };
}
