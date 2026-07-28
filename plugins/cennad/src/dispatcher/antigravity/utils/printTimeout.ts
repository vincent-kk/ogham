// agy's --print-timeout takes a Go duration and defaults to 5m — short enough to cut
// off any long delegation on its own, so the tier's ceiling is always sent explicitly.
// Seconds keep the conversion exact; agy parses "21600s" the same as "6h0m0s".
export function printTimeout(hardCapMs: number): string {
  return `${Math.max(1, Math.ceil(hardCapMs / 1000))}s`;
}
