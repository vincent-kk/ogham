import { readAgyTranscript } from './agyTranscriptStore.js';

// Fallback for callAgy when `agy -p` returns empty stdout (Issue #76): recover
// the answer from agy's on-disk transcript. Any failure (missing files, schema
// drift, parse error) collapses to null so callAgy emits its existing cli_error
// rather than a fake or corrupted success.
export async function resolveTranscript(
  cwd: string,
  since: number,
): Promise<string | null> {
  try {
    return await readAgyTranscript(cwd, since);
  } catch {
    return null;
  }
}
