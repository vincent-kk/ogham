/**
 * CI/test shim that monkey-patches child_process.spawn to intercept `gh` CLI
 * calls and return fixture JSON responses. Activated when CI=1 or
 * IMBAS_GH_SHIM=1.
 */

import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createRequire } from 'node:module';

// ESM namespace objects are sealed; use CJS require for a mutable reference.
const _require = createRequire(import.meta.url);
const cp = _require('child_process');

export function createGhShim({ fixtures = {} } = {}) {
  const calls = [];
  let _origSpawn = null;
  let _active = false;

  function handle(cmd, args) {
    const isGh = cmd === 'gh' || cmd.endsWith('/gh');
    if (!isGh) return null;

    const sub = args[0];
    const action = args[1];

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
        if (fixtures['label-create-403']) {
          return {
            payload: JSON.stringify(fixtures['label-create-403']),
            exitCode: 1,
          };
        }
        return { payload: '', exitCode: 0 };
      }
    }

    if (sub === 'api') {
      return { payload: JSON.stringify({ id: 1 }), exitCode: 0 };
    }

    return { payload: `Unknown gh subcommand: ${sub} ${action}`, exitCode: 2 };
  }

  function makeFakeProcess(stdoutPayload, exitCode) {
    const proc = new EventEmitter();
    proc.stdout = new Readable({ read() {} });
    proc.stderr = new Readable({ read() {} });
    proc.stdin = { write() {}, end() {} };
    proc.pid = Math.floor(Math.random() * 90000) + 10000;
    proc.killed = false;
    proc.kill = () => { proc.killed = true; };

    process.nextTick(() => {
      if (stdoutPayload) proc.stdout.push(stdoutPayload);
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
    if (!shouldActivate || _active) return;

    _origSpawn = cp.spawn;
    _active = true;

    cp.spawn = function shimmedSpawn(cmd, args = [], opts = {}) {
      const argArray = Array.from(args);
      calls.push({ cmd, args: argArray, timestamp: new Date().toISOString() });
      const result = handle(cmd, argArray);
      if (result !== null) return makeFakeProcess(result.payload, result.exitCode);
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
