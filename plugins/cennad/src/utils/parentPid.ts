export function getParentPid(): number {
  return typeof process.ppid === 'number' ? process.ppid : -1;
}
