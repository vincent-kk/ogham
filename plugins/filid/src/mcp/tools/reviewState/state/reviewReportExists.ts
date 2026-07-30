import { readFileIfExistsSync } from '@ogham/cross-platform';

export function reviewReportExists(reportPath: string): boolean {
  return readFileIfExistsSync(reportPath) !== null;
}
