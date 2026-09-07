import { execFileSync } from "node:child_process";

/**
 * Lists the paths that differ between the merge base of two refs and the head.
 *
 * @param {string} root Absolute repository root the git command runs in.
 * @param {string} base Ref the change is measured from; its merge base with `head` is used.
 * @param {string} head Ref holding the change.
 * @returns {string[]} Repository-relative forward-slash paths, deletions included.
 * @throws When either ref cannot be resolved — the caller falls back to a full run.
 */
export function listChangedFiles(root, base, head) {
  const output = execFileSync(
    "git",
    ["diff", "--name-only", `${base}...${head}`],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return output.split("\n").filter((line) => line.length > 0);
}
