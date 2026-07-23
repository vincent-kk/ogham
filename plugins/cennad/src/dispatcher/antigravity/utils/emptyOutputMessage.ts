// callAgy's terminal cli_error text when agy exits 0 but yields no parseable
// stdout and no recoverable transcript. agy 1.1.3+ prints an actionable reason to
// stderr in this case — e.g. a tool hit a permission it cannot prompt for in
// headless -p mode, naming --dangerously-skip-permissions as the fix. Surface that
// verbatim so the failure states its cause instead of a generic "no output"; fall
// back to the version-agnostic hint when stderr is empty.
export function emptyOutputMessage(stderr: string): string {
  const detail = stderr.trim();
  if (detail.length > 0)
    return `agy produced no recoverable output. agy reported: ${detail}`;
  return 'agy returned no output and the response could not be recovered. Try again, or update the agy CLI.';
}
