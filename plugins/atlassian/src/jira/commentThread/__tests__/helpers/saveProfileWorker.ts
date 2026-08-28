import { writeFileSync } from "node:fs";

import { CommentProfileSchema } from "../../../../types/index.js";
import { saveCommentProfile } from "../../profile/saveCommentProfile.js";

const [profilePath, readyPath, hostname, profileJson] = process.argv.slice(2);
if (!profilePath || !readyPath || !hostname || !profileJson)
  throw new Error(
    "saveProfileWorker requires path, ready path, hostname, and profile JSON",
  );

const profile = CommentProfileSchema.parse(JSON.parse(profileJson));
writeFileSync(readyPath, "ready", "utf8");
await saveCommentProfile(hostname, profile, profilePath);
