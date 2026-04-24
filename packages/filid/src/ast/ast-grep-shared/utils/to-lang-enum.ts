import type { NapiLang, SgModule } from '../../../types/index.js';

import { getMappedLang } from './getMappedLang.js';

/**
 * Convert lowercase language string to ast-grep Lang enum value
 */
export function toLangEnum(sg: SgModule, language: string): NapiLang {
  // Lang enum only contains built-in languages (Html, JavaScript, Tsx, Css, TypeScript).
  // All others (Python, Go, Rust, etc.) are CustomLang strings passed directly.
  const lang = getMappedLang(sg, language);
  if (lang === undefined) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return lang;
}
