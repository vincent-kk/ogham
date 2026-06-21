/**
 * Write the hook result to stdout.
 */
export function writeResult(result: unknown): void {
  process.stdout.write(JSON.stringify(result));
}
