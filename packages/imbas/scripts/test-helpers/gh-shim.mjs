/**
 * @file gh-shim.mjs
 * @description CI/test shim that monkey-patches child_process.spawn to intercept
 *   `gh` CLI calls and return fixture JSON responses. Activated when
 *   process.env.CI === '1' OR process.env.IMBAS_GH_SHIM === '1'.
 *
 *   Usage:
 *     import { createGhShim } from './gh-shim.mjs';
 *     const shim = createGhShim({ fixtures });
 *     shim.install();
 *     // ... run code under test ...
 *     shim.uninstall();
 *     console.log(shim.calls);
 */

import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';

// ESM namespace objects are sealed — use CJS require to get a mutable reference
// that allows monkey-patching cp.spawn.
const _require = createRequire(import.meta.url);
const cp = _require('child_process');

/**
 * @param {{ fixtures: Record<string, unknown> }} options
 *   fixtures: map of fixture key → payload object. Keys:
 *     'issue-view', 'issue-create', 'label-list', 'label-create-403',
 *     'digest-collision-2markers', 'links-4types'
 */
export function createGhShim({ fixtures = {} } = {}) {
  /** @type {Array<{cmd: string, args: string[], timestamp: string}>} */
  const calls = [];

  let _origSpawn = null;
  let _active = false;

  /**
   * Match a `gh` invocation and return { payload, exitCode } or null.
   * @param {string} cmd
   * @param {string[]} args
   * @returns {{ payload: string, exitCode: number } | null}
   */
  function handle(cmd, args) {
    const isGh = cmd === 'gh' || cmd.endsWith('/gh');
    if (!isGh) return null;

    const sub = args[0]; // 'issue', 'label', 'api'
    const action = args[1]; // 'view', 'create', 'comment', 'close', 'list', ...

    if (sub === 'issue') {
      if (action === 'view') {
        const payload = fixtures['issue-view'] ?? {};
        return { payload: JSON.stringify(payload), exitCode: 0 };
      }
      if (action === 'create') {
        const payload = fixtures['issue-create'] ?? { number: 1, url: 'https://github.com/owner/repo/issues/1' };
        return { payload: JSON.stringify(payload), exitCode: 0 };
      }
      if (action === 'comment') {
        return { payload: '', exitCode: 0 };
      }
      if (action === 'close') {
        return { payload: '', exitCode: 0 };
      }
    }

    if (sub === 'label') {
      if (action === 'list') {
        const payload = fixtures['label-list'] ?? [];
        return { payload: JSON.stringify(payload), exitCode: 0 };
      }
      if (action === 'create') {
        // Return 403 payload if fixture key exists, else success empty
        if (fixtures['label-create-403']) {
          const payload = fixtures['label-create-403'];
          return { payload: JSON.stringify(payload), exitCode: 1 };
        }
        return { payload: '', exitCode: 0 };
      }
    }

    if (sub === 'api') {
      // gh api repos/<o>/<r>/issues/<n> --method PATCH
      return { payload: JSON.stringify({ id: 1 }), exitCode: 0 };
    }

    // Unknown subcommand — fail with exit 2
    return { payload: `Unknown gh subcommand: ${sub} ${action}`, exitCode: 2 };
  }

  /**
   * Create a fake ChildProcess-compatible EventEmitter.
   * @param {string} stdoutPayload
   * @param {number} exitCode
   */
  function makeFakeProcess(stdoutPayload, exitCode) {
    const proc = new EventEmitter();

    proc.stdout = new Readable({ read() {} });
    proc.stderr = new Readable({ read() {} });
    proc.stdin = { write() {}, end() {} };
    proc.pid = Math.floor(Math.random() * 90000) + 10000;
    proc.killed = false;
    proc.kill = () => { proc.killed = true; };

    // Emit data asynchronously to avoid sync re-entrancy issues
    process.nextTick(() => {
      if (stdoutPayload) {
        proc.stdout.push(stdoutPayload);
      }
      proc.stdout.push(null);
      proc.stderr.push(null);
      proc.emit('exit', exitCode, null);
      proc.emit('close', exitCode, null);
    });

    return proc;
  }

  function install() {
    const shouldActivate =
      process.env.CI === '1' || process.env.IMBAS_GH_SHIM === '1';
    if (!shouldActivate) return;
    if (_active) return;

    _origSpawn = cp.spawn;
    _active = true;

    cp.spawn = function shimmedSpawn(cmd, args = [], opts = {}) {
      calls.push({ cmd, args: Array.from(args), timestamp: new Date().toISOString() });

      const result = handle(cmd, Array.from(args));
      if (result !== null) {
        return makeFakeProcess(result.payload, result.exitCode);
      }
      // Fall through to real spawn for non-gh commands
      return _origSpawn(cmd, args, opts);
    };
  }

  function uninstall() {
    if (!_active) return;
    cp.spawn = _origSpawn;
    _origSpawn = null;
    _active = false;
  }

  return { install, uninstall, calls };
}
