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

export type SgModule = typeof AstGrepNapi;

let sgModule: SgModule | null = null;
let sgLoadFailed = false;
let sgLoadError = '';

/** Max files collected per search */
export const MAX_FILES = 1000;

/** Directories excluded from file walks */
export const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.venv',
  'venv',
]);

/**
 * Supported languages mapped to their file extensions.
 * 17 languages supported by @ast-grep/napi.
 */
export const SUPPORTED_LANGUAGES: Record<string, string[]> = {
  javascript: ['.js', '.mjs', '.cjs', '.jsx'],
  typescript: ['.ts', '.mts', '.cts'],
  tsx: ['.tsx'],
  python: ['.py'],
  ruby: ['.rb'],
  go: ['.go'],
  rust: ['.rs'],
  java: ['.java'],
  kotlin: ['.kt', '.kts'],
  swift: ['.swift'],
  c: ['.c', '.h'],
  cpp: ['.cpp', '.cc', '.cxx', '.hpp'],
  csharp: ['.cs'],
  html: ['.html', '.htm'],
  css: ['.css'],
  json: ['.json'],
  yaml: ['.yaml', '.yml'],
};

/** Extension → language lookup (derived from SUPPORTED_LANGUAGES) */
export const EXT_TO_LANG: Record<string, string> = Object.entries(
  SUPPORTED_LANGUAGES,
).reduce(
  (acc, [lang, exts]) => {
    for (const ext of exts) acc[ext] = lang;
    return acc;
  },
  {} as Record<string, string>,
);

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
export function toLangEnum(sg: SgModule, language: string): unknown {
  // Lang enum only contains built-in languages (Html, JavaScript, Tsx, Css, TypeScript).
  // All others (Python, Go, Rust, etc.) are CustomLang strings passed directly.
  const langMap: Record<string, unknown> = {
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
  const lang = langMap[language];
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
  maxFiles = MAX_FILES,
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
        if (!EXCLUDED_DIRS.has(entry.name)) {
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
