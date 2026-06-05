export function extractVerdict(content: string): string {
  const match = content.match(
    /\*\*Verdict\*\*:\s*(APPROVED|REQUEST_CHANGES|INCONCLUSIVE)/,
  );
  return match?.[1] ?? 'UNKNOWN';
}
