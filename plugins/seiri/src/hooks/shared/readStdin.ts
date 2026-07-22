/**
 * Read all of stdin, with a timeout so a hook can never hang the session.
 *
 * The plain `for await (const chunk of process.stdin)` form waits for EOF
 * forever. Some host and subagent environments do not close the hook's
 * stdin, so the timeout is the only thing that guarantees the process
 * exits. Timing out yields whatever arrived rather than throwing — the
 * caller treats unparseable input as "no injection".
 */
export function readStdin(timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (value: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.stdin.removeAllListeners();
      resolve(value);
    };

    const timer = setTimeout(() => {
      // stdin never signalled EOF — release the descriptor explicitly.
      process.stdin.destroy();
      finish(Buffer.concat(chunks).toString('utf8'));
    }, timeoutMs);

    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => finish(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', () => finish(''));

    if (process.stdin.readableEnded)
      finish(Buffer.concat(chunks).toString('utf8'));
  });
}
