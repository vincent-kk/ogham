/**
 * Shared utilities for ast-grep based AST analysis.
 *
 * Provides lazy-loaded @ast-grep/napi module, language mapping,
 * file discovery, and match formatting used by all ast modules.
 */
import {
  AST_MAX_FILES,
  AST_SKIP_DIRS,
  EXT_TO_LANG,
  SUPPORTED_LANGUAGES,
} from '../../constants/astLanguages.js';
import type { NapiLang, SgModule } from '../../types/index.js';

import { formatMatch } from './utils/formatMatch.js';
import { getFilesForLanguage } from './utils/getFilesForLanguage.js';
import { getSgLoadError, getSgModule } from './utils/getSgModule.js';
import { toLangEnum } from './utils/toLangEnum.js';

export { SUPPORTED_LANGUAGES, EXT_TO_LANG };
export {
  formatMatch,
  getFilesForLanguage,
  getSgLoadError,
  getSgModule,
  toLangEnum,
};
export type { NapiLang, SgModule };
export { AST_MAX_FILES, AST_SKIP_DIRS };
