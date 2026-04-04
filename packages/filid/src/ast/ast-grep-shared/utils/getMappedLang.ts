import { FALLBACK_LANG_MAP } from '../../../constants/ast-languages.js';
import type { NapiLang, SgModule } from '../../../types/index.js';

export function getMappedLang(
  sg: SgModule,
  language: string,
): NapiLang | undefined {
  switch (language) {
    case 'javascript':
      return sg.Lang.JavaScript;
    case 'typescript':
      return sg.Lang.TypeScript;
    case 'tsx':
      return sg.Lang.Tsx;
    case 'html':
      return sg.Lang.Html;
    case 'css':
      return sg.Lang.Css;
    default:
      return FALLBACK_LANG_MAP[language];
  }
}
