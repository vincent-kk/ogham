export function isDebug(): boolean {
  return process.env['FILID_DEBUG'] === '1';
}
