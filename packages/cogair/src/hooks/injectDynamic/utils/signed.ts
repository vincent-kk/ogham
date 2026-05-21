export function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
