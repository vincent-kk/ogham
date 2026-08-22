import { TASK_NAME_PATTERN } from '../../../constants/gates.js';

/**
 * Narrow an unknown value to a safe task directory name.
 *
 * @param value Candidate task name.
 * @returns Whether the value is lowercase kebab-case without path segments.
 */
export function isTaskName(value: unknown): value is string {
  return typeof value === 'string' && TASK_NAME_PATTERN.test(value);
}
