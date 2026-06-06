// Defensive no-op. Real-CLI verification (agy 1.0.6) shows `agy -p` emits stdout
// under cogair's non-TTY spawn (stdin closed), so the empty-stdout path is not
// reached in practice; returning null lets callAgy surface a clear error on the
// off chance it ever is, without reverse-engineering agy's transcript storage.
export async function resolveTranscript(
  _cwd: string,
  _since: number,
): Promise<string | null> {
  return null;
}
