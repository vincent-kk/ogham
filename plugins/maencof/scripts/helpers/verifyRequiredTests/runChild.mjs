import { spawn } from 'node:child_process';

/** Spawn the package's designated test command with literal argv; return its exit status. */
export function runChild(command, args, options) {
  return new Promise((fulfill, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', reject);
    child.once('exit', (code) => fulfill(code));
  });
}
