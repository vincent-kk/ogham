/**
 * Shared stdin utilities for imbas hook scripts
 * Provides timeout-protected stdin reading to prevent hangs in subagent environments.
 */

/**
 * Read all stdin with timeout to prevent indefinite hang.
 *
 * The blocking `for await (const chunk of process.stdin)` pattern waits
 * indefinitely for EOF. In subagent environments, if the parent process
 * doesn't properly close stdin, this hangs forever. This function uses
 * event-based reading with a timeout as a safety net.
 *
 * @param timeoutMs - Maximum time to wait for stdin (default: 5000ms)
 * @returns The stdin content, or empty string on error/timeout
 */
export function readStdin(timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const settle = (): void => {
      clearTimeout(timeout);
      process.stdin.removeAllListeners();
    };

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        settle();
        // Timeout: stdin never sent EOF — force-close to release FD
        process.stdin.destroy();
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    }, timeoutMs);

    process.stdin.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      if (!settled) {
        settled = true;
        settle();
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    });

    process.stdin.on('error', () => {
      if (!settled) {
        settled = true;
        settle();
        resolve('');
      }
    });

    // If stdin is already ended (e.g. empty pipe), 'end' fires immediately
    // But if stdin is a TTY or never piped, we need the timeout as safety net
    if (process.stdin.readableEnded) {
      if (!settled) {
        settled = true;
        settle();
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    }
  });
}
