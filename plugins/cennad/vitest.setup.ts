import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Redirect `homedir()` to a per-test-file tmp dir so cennad's CENNAD_HOME
// (= `<home>/.claude/plugins/cennad`) operates inside an isolated sandbox.
// `os.homedir()` reads HOME on POSIX but USERPROFILE on Windows, so BOTH must
// be set — otherwise Windows runs fall back to the real global dir, where
// parallel workers race on `atomicWrite`'s rename and surface as flaky EPERM.
// Phase 1's `paths.test.ts` keeps passing because both sides of its
// assertion read `homedir()` after this override.
const testHome = mkdtempSync(join(tmpdir(), 'cennad-test-'));
process.env.HOME = testHome;
process.env.USERPROFILE = testHome;
