import { readFileIfExistsSync } from '@ogham/cross-platform/filesystem';

export function reviewReportExists(reportPath: string): boolean {
  return readFileIfExistsSync(reportPath) !== null;
}
