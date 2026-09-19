/**
 * Shared stdin utilities for filid hook scripts.
 *
 * Provides timeout-protected stdin reading so a hook cannot hang when its parent
 * never closes stdin — the failure mode seen in subagent environments.
 */

/** What one stdin read produced, and whether the input actually ended. */
export interface StdinReadResult {
  /** Text read before the input ended, timed out or failed; empty on an error. */
  text: string;
  /** True only when the input reached its end; false on a timeout or an error. */
  complete: boolean;
}

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
export async function readStdin(timeoutMs = 5000): Promise<string> {
  return (await readStdinResult(timeoutMs)).text;
}

/**
 * Read all of an input stream, telling a timeout apart from its end.
 *
 * A caller that must not act on half a list — a partial file list would make
 * a partial submission look complete — refuses a result that is not complete.
 * @param timeoutMs - Maximum time to wait for the end of the input
 * @param input - Stream to read; the process's stdin by default
 * @returns The text read and whether the input ended; a timed-out stream is destroyed to release its descriptor
 */
export function readStdinResult(
  timeoutMs: number,
  input: NodeJS.ReadableStream & {
    readableEnded?: boolean;
    destroy?: () => void;
  } = process.stdin,
): Promise<StdinReadResult> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const settle = (): void => {
      clearTimeout(timeout);
      input.removeAllListeners();
    };

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        settle();
        // Timeout: stdin never sent EOF — force-close to release FD
        input.destroy?.();
        resolve({
          text: Buffer.concat(chunks).toString('utf-8'),
          complete: false,
        });
      }
    }, timeoutMs);

    input.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });

    input.on('end', () => {
      if (!settled) {
        settled = true;
        settle();
        resolve({
          text: Buffer.concat(chunks).toString('utf-8'),
          complete: true,
        });
      }
    });

    input.on('error', () => {
      if (!settled) {
        settled = true;
        settle();
        resolve({ text: '', complete: false });
      }
    });

    // If stdin is already ended (e.g. empty pipe), 'end' fires immediately
    // But if stdin is a TTY or never piped, we need the timeout as safety net
    if (input.readableEnded)
      if (!settled) {
        settled = true;
        settle();
        resolve({
          text: Buffer.concat(chunks).toString('utf-8'),
          complete: true,
        });
      }
  });
}
