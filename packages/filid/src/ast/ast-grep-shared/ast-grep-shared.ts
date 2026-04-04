/**
 * Shared utilities for ast-grep based AST analysis.
 *
 * Provides lazy-loaded @ast-grep/napi module, language mapping,
 * file discovery, and match formatting used by all ast modules.
 */
import { readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';

// Dynamic import for @ast-grep/napi
// Graceful degradation: if the module is not available (e.g., in bundled/plugin context),
// tools will return a helpful error message instead of crashing
//
// IMPORTANT: Uses createRequire() (CJS resolution) instead of dynamic import() (ESM resolution)
// because ESM resolution does NOT respect NODE_PATH or Module._initPaths().
// In the MCP server plugin context, @ast-grep/napi is installed globally and resolved
// via NODE_PATH set in the bundle's startup banner.
import type * as AstGrepNapi from '@ast-grep/napi';
import {
  SUPPORTED_LANGUAGES,
  EXT_TO_LANG,
  AST_SKIP_DIRS,
  AST_MAX_FILES,
} from '../../constants/ast-languages.js';

export { SUPPORTED_LANGUAGES, EXT_TO_LANG };

type SgModule = typeof AstGrepNapi;
/** Type accepted by sg.parse() — built-in Lang enum values or CustomLang strings */
type NapiLang = Parameters<SgModule['parse']>[0];

let sgModule: SgModule | null = null;
let sgLoadFailed = false;
let sgLoadError = '';

export async function getSgModule(): Promise<SgModule | null> {
  if (sgLoadFailed) {
    return null;
  }
  if (!sgModule) {
    try {
      // Use createRequire for CJS-style resolution (respects NODE_PATH)
      // In CJS bundles, import.meta.url becomes undefined (esbuild replaces import.meta with {}).
      // __filename provides the bundle file path as fallback for CJS-relative resolution.
      const _base =
        import.meta.url ||
        (typeof __filename !== 'undefined' ? __filename : undefined) ||
        process.cwd() + '/';
      const require = createRequire(_base);
      sgModule = require('@ast-grep/napi') as SgModule;
    } catch {
      // Fallback to dynamic import for pure ESM environments
      try {
        // @ts-ignore - optional dependency, may not be installed
        sgModule = await import('@ast-grep/napi');
      } catch (error) {
        sgLoadFailed = true;
        sgLoadError = error instanceof Error ? error.message : String(error);
        return null;
      }
    }
  }
  return sgModule;
}

export function getSgLoadError(): string {
  return sgLoadError;
}

/**
 * Convert lowercase language string to ast-grep Lang enum value
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

  const lang = langMap[language];
  if (!lang) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return lang;
}

/**
 * Get files matching the language in a directory
 */
export function getFilesForLanguage(
  dirPath: string,
  language: string,
  maxFiles = AST_MAX_FILES,
): string[] {
  const files: string[] = [];
  const extensions = Object.entries(EXT_TO_LANG)
    .filter(([_, lang]) => lang === language)
    .map(([ext]) => ext);

  function walk(dir: string) {
    if (files.length >= maxFiles) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (files.length >= maxFiles) return;

        const fullPath = join(dir, entry.name);

        // Skip common non-source directories
        if (entry.isDirectory()) {
          if (!AST_SKIP_DIRS.includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  const resolvedPath = resolve(dirPath);
  const stat = statSync(resolvedPath);

  if (stat.isFile()) {
    return [resolvedPath];
  }

  walk(resolvedPath);
  return files;
}

/**
 * Format a match result for display
 */
export function formatMatch(
  filePath: string,
  _matchText: string,
  startLine: number,
  endLine: number,
  context: number,
  fileContent: string,
): string {
  const lines = fileContent.split('\n');
  const contextStart = Math.max(0, startLine - context - 1);
  const contextEnd = Math.min(lines.length, endLine + context);

  const contextLines = lines.slice(contextStart, contextEnd);
  const numberedLines = contextLines.map((line, i) => {
    const lineNum = contextStart + i + 1;
    const isMatch = lineNum >= startLine && lineNum <= endLine;
    const prefix = isMatch ? '>' : ' ';
    return `${prefix} ${lineNum.toString().padStart(4)}: ${line}`;
  });

  return `${filePath}:${startLine}\n${numberedLines.join('\n')}`;
}
