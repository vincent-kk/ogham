import {
  chmodSync,
  closeSync,
  openSync,
  renameSync,
  writeFileSync,
} from "node:fs";

import {
  readFileIfExistsSync,
  removeFileIfExistsSync,
  withFileLockSync,
} from "@ogham/cross-platform";

import { COMMENT_PROFILES_PATH } from "../../../constants/index.js";
import {
  COMMENT_PROFILE_SCHEMA_VERSION,
  CommentProfileFileSchema,
} from "../../../types/index.js";
import type { CommentProfile } from "../../../types/index.js";

/**
 * Write one site's profile without touching the others.
 * @param hostname Site key — `extractHostname(base_url)` of the resolved site.
 * @param profile Already validated by `CommentProfileSchema`.
 * @param path Profile file; defaults to the plugin data directory file.
 * @returns The path written. A shared cross-process lock protects the read-modify-write and `<path>.temp` is renamed atomically with mode `0o600`.
 * @throws When the lock is busy or an existing file is invalid JSON or does not match the current envelope schema.
 */
export async function saveCommentProfile(
  hostname: string,
  profile: CommentProfile,
  path: string = COMMENT_PROFILES_PATH,
): Promise<string> {
  const locked = withFileLockSync(path, () => {
    const bytes = readFileIfExistsSync(path);
    let sites: Record<string, unknown> = {};
    if (bytes !== null) {
      let existing: unknown;
      try {
        existing = JSON.parse(Buffer.from(bytes).toString("utf8"));
      } catch (error) {
        throw new Error(
          `${path} is not valid JSON; fix or remove it before saving a profile`,
          { cause: error },
        );
      }
      const envelope = CommentProfileFileSchema.safeParse(existing);
      if (!envelope.success)
        throw new Error(
          `${path} does not match comment profile schema; fix or remove it before saving a profile`,
        );
      sites = { ...envelope.data.sites };
    }
    sites[hostname] = profile;

    const temp = `${path}.temp`;
    removeFileIfExistsSync(temp);
    let descriptor: number | null = null;
    try {
      descriptor = openSync(temp, "wx", 0o600);
      writeFileSync(
        descriptor,
        `${JSON.stringify({ schemaVersion: COMMENT_PROFILE_SCHEMA_VERSION, sites }, null, 2)}\n`,
      );
      closeSync(descriptor);
      descriptor = null;
      chmodSync(temp, 0o600);
      renameSync(temp, path);
    } finally {
      if (descriptor !== null) closeSync(descriptor);
      removeFileIfExistsSync(temp);
    }
    return path;
  });
  if (!locked.acquired)
    throw new Error(`${path} is busy; retry saving the profile`);
  return locked.value;
}
