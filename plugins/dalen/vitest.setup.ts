import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Redirect dalen's disk root (CLAUDE_CONFIG_DIR -> ~/.claude/plugins/dalen) to a
// per-test-file tmp dir so tests never touch the real global directory. HOME /
// USERPROFILE are also set so any homedir() fallback stays sandboxed.
const testHome = mkdtempSync(join(tmpdir(), "dalen-test-"));
process.env.CLAUDE_CONFIG_DIR = testHome;
process.env.HOME = testHome;
process.env.USERPROFILE = testHome;
process.env.DALEN_NO_BROWSER = "1";
