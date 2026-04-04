/**
 * Shared utilities for ast-grep based AST analysis.
 *
 * Provides lazy-loaded @ast-grep/napi module, language mapping,
 * file discovery, and helpers used by all ast modules.
 *
 * Loading strategy:
 * 1. createRequire() CJS resolution (respects NODE_PATH — global installs)
 * 2. dynamic import() ESM fallback
 * 3. If both fail, set sgLoadFailed = true (session-level, no retry)
 */
import { readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';

import type * as AstGrepNapi from '@ast-grep/napi';

import {
  AST_EXCLUDED_DIRS,
  AST_MAX_FILES,
  EXT_TO_LANG,
  SUPPORTED_LANGUAGES,
} from '../../constants/ast.js';

export type SgModule = typeof AstGrepNapi;
/** Type accepted by sg.parse() — built-in Lang enum values or CustomLang strings */
export type NapiLang = Parameters<SgModule['parse']>[0];

export {
  AST_MAX_FILES as MAX_FILES,
  AST_EXCLUDED_DIRS as EXCLUDED_DIRS,
  SUPPORTED_LANGUAGES,
  EXT_TO_LANG,
};

let sgModule: SgModule | null = null;
let sgLoadFailed = false;
let sgLoadError = '';

/**
 * Lazy-load @ast-grep/napi. Returns the module or null if unavailable.
 * Session-level: once failed, subsequent calls return null immediately.
 */
export async function getSgModule(): Promise<SgModule | null> {
  if (sgLoadFailed) return null;
  if (sgModule) return sgModule;

  // Attempt 1: CJS resolution via createRequire (respects NODE_PATH)
  try {
    const _base =
      (typeof import.meta !== 'undefined' && import.meta.url) ||
      (typeof __filename !== 'undefined' ? __filename : undefined) ||
      process.cwd() + '/index.js';
    const require = createRequire(_base);
    sgModule = require('@ast-grep/napi') as SgModule;
    return sgModule;
  } catch {
    // fall through to ESM attempt
  }

  // Attempt 2: ESM dynamic import
  try {
    // @ts-ignore — optional dependency, may not be installed
    sgModule = await import('@ast-grep/napi');
    return sgModule;
  } catch (error) {
    sgLoadFailed = true;
    sgLoadError = error instanceof Error ? error.message : String(error);
    return null;
  }
}

/** Returns true if @ast-grep/napi was successfully loaded in this session. */
export function isSgAvailable(): boolean {
  return sgModule !== null && !sgLoadFailed;
}

/** Returns the load error message, or empty string if none. */
export function getSgLoadError(): string {
  return sgLoadError;
}

/**
 * Convert a lowercase language string to the ast-grep Lang enum value.
 * Throws for unsupported languages.
 */
export function toLangEnum(sg: SgModule, language: string): NapiLang {
  // Lang enum only contains built-in languages (Html, JavaScript, Tsx, Css, TypeScript).
  // All others (Python, Go, Rust, etc.) are CustomLang strings passed directly.
  const langMap: Record<string, NapiLang> = {
    javascript: sg.Lang.JavaScript,
    typescript: sg.Lang.TypeScript,
    tsx: sg.Lang.Tsx,
    html: sg.Lang.Html,
    css: sg.Lang.Css,
    python: 'Python',
    ruby: 'Ruby',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    kotlin: 'Kotlin',
    swift: 'Swift',
    c: 'C',
    cpp: 'Cpp',
    csharp: 'CSharp',
    json: 'Json',
    yaml: 'Yaml',
  };
  const lang: NapiLang | undefined = langMap[language];
  if (lang === undefined) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return lang;
}

/**
 * Return the language identifier for a file extension.
 * Returns null for unknown extensions.
 */
export function getLanguageFromExtension(ext: string): string | null {
  return EXT_TO_LANG[ext.toLowerCase()] ?? null;
}

/**
 * Return the list of file extensions for a given language.
 * Returns an empty array for unknown languages.
 */
export function getExtensionsForLanguage(lang: string): string[] {
  return SUPPORTED_LANGUAGES[lang] ?? [];
}

/**
 * Walk a directory and collect files matching the given language.
 * Skips excluded directories and honours maxFiles limit.
 */
export function collectFiles(
  dir: string,
  language: string,
  maxFiles = AST_MAX_FILES,
): string[] {
  const extensions = new Set(getExtensionsForLanguage(language));
  if (extensions.size === 0) return [];

  const files: string[] = [];
  const resolvedDir = resolve(dir);

  try {
    const stat = statSync(resolvedDir);
    if (stat.isFile()) {
      return [resolvedDir];
    }
  } catch {
    return [];
  }

  function walk(current: string): void {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return; // permission error — skip silently
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      if (entry.isDirectory()) {
        if (!AST_EXCLUDED_DIRS.has(entry.name)) {
          walk(join(current, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (extensions.has(ext)) {
          files.push(join(current, entry.name));
        }
      }
    }
  }

  walk(resolvedDir);
  return files;
}
