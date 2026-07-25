import { isPlainObject } from '../../shared/isPlainObject.js';

const MAX_INPUT_BYTES = 1024 * 1024;

// Reads the UserPromptSubmit payload the host writes to stdin and returns its
// `prompt`. Never rejects — every failure path yields '' so the hook still emits
// its context and exits 0.
//
// Chunks stay raw Buffers until EOF and are decoded once. Decoding per chunk
// would corrupt any UTF-8 sequence split across a chunk boundary, which Korean
// prompts hit routinely. The timeout is deliberately not unref'd: it exists for
// the case where the host leaves stdin open and 'end' never arrives.
export function readPromptFromStdin(timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve('');

    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    const finish = (value: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      process.stdin.removeAllListeners();
      // Release the fd so the process can exit without waiting on stdin.
      process.stdin.destroy();
      resolve(value);
    };

    const parse = (): void => {
      try {
        const parsed: unknown = JSON.parse(
          Buffer.concat(chunks).toString('utf-8'),
        );
        const prompt = isPlainObject(parsed) ? parsed.prompt : undefined;
        finish(typeof prompt === 'string' ? prompt : '');
      } catch {
        finish('');
      }
    };

    const timer = setTimeout(() => finish(''), timeoutMs);

    process.stdin.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_INPUT_BYTES) return finish('');
      chunks.push(chunk);
    });
    process.stdin.once('end', parse);
    process.stdin.once('error', () => finish(''));
    if (process.stdin.readableEnded) parse();
  });
}
