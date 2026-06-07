import type * as AstGrepNapi from '@ast-grep/napi';

export type SgModule = typeof AstGrepNapi;
/** Type accepted by sg.parse() — built-in Lang enum values or CustomLang strings */
export type NapiLang = Parameters<SgModule['parse']>[0];
