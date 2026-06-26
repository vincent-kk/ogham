import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Redirect r-statistics' disk root (CLAUDE_CONFIG_DIR -> ~/.claude/plugins/
// r-statistics) to a per-test-file tmp dir so tests never touch the real global
// directory. HOME / USERPROFILE are also set so any homedir() fallback stays
// sandboxed.
const testHome = mkdtempSync(join(tmpdir(), "r-statistics-test-"));
process.env.CLAUDE_CONFIG_DIR = testHome;
process.env.HOME = testHome;
process.env.USERPROFILE = testHome;
