// Issue #76 fallback: `agy -p` can silently drop stdout in non-TTY contexts
// (subprocess/pipe), which is exactly how cogair spawns it. The intended
// recovery is to read agy's transcript file for the run. The transcript path
// and format are version-dependent and confirmed only at the real-CLI
// verification stage (plan R1), so this returns null until that probe is wired
// — callAgy then surfaces a clear Issue #76 error instead of guessing a path.
export async function resolveTranscript(
  _cwd: string,
  _since: number,
): Promise<string | null> {
  return null;
}
