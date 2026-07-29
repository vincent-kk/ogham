import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Redirect the host state root so the user config layer resolves into a
// per-test-file tmp dir instead of the developer's real ~/.claude. Without
// this, a vault list stored in the real user layer would merge into every
// test that reads the effective config.
process.env.CLAUDE_CONFIG_DIR = mkdtempSync(join(tmpdir(), "lens-state-"));
