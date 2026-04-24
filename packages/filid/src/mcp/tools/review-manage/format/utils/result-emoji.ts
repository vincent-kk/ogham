export function resultEmoji(result: string): string {
  if (result === 'PASS') return '✅';
  if (result === 'FAIL') return '❌';
  return '⏭️';
}
