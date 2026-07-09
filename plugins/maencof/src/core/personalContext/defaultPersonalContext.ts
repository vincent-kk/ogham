/**
 * @file defaultPersonalContext.ts
 * @description 빈 personal-context envelope 기본값을 생성한다.
 */
import {
  DEFAULT_PERSONAL_CONTEXT_CONFIG,
  PERSONAL_CONTEXT_SCHEMA_VERSION,
} from '../../constants/personalContext.js';
import type { PersonalContextFile } from '../../types/personalContext.js';

export function defaultPersonalContext(): PersonalContextFile {
  return {
    _schemaVersion: PERSONAL_CONTEXT_SCHEMA_VERSION,
    config: { ...DEFAULT_PERSONAL_CONTEXT_CONFIG },
    states: [],
    topics: [],
  };
}
