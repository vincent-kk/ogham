/**
 * Recognize the date and minimum-width sequence syntax shared by run operations.
 * @param name Directory entry name, without a parent path.
 * @returns Whether the complete name has the run ID format.
 */
export function isRunId(name: string): boolean {
  return /^\d{8}-\d{3,}$/.test(name);
}
