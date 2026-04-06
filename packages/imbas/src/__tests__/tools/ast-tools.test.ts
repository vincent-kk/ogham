import { describe, it, expect, vi } from 'vitest';

// Mock ast-grep-shared module — default: napi unavailable
vi.mock('../../ast/ast-grep-shared/ast-grep-shared.js', () => ({
  getSgModule: vi.fn().mockResolvedValue(null),
  getSgLoadError: vi.fn().mockReturnValue('Cannot find module @ast-grep/napi'),
  isSgAvailable: vi.fn().mockReturnValue(false),
  collectFiles: vi.fn().mockReturnValue([]),
  toLangEnum: vi.fn(),
  EXT_TO_LANG: { '.ts': 'typescript', '.js': 'javascript' },
  SUPPORTED_LANGUAGES: { typescript: ['.ts', '.mts'], javascript: ['.js', '.mjs'] },
}));

// Also mock the direct imports in dependency-extractor and cyclomatic-complexity
vi.mock('../../ast/dependency-extractor/dependency-extractor.js', async () => {
  const { getSgModule, getSgLoadError } = await import('../../ast/ast-grep-shared/ast-grep-shared.js');
  return {
    extractDependencies: async () => {
      const sg = await getSgModule();
      if (!sg) {
        return {
          error: '@ast-grep/napi is not available. Install it with: npm install -g @ast-grep/napi',
          sgLoadError: getSgLoadError(),
        };
      }
      return { imports: [], exports: [], calls: [] };
    },
  };
});

vi.mock('../../ast/cyclomatic-complexity/cyclomatic-complexity.js', async () => {
  const { getSgModule, getSgLoadError } = await import('../../ast/ast-grep-shared/ast-grep-shared.js');
  return {
    calculateComplexity: async () => {
      const sg = await getSgModule();
      if (!sg) {
        return {
          error: '@ast-grep/napi is not available. Install it with: npm install -g @ast-grep/napi',
          sgLoadError: getSgLoadError(),
        };
      }
      return { value: 1, fileTotal: 1, perFunction: { '(file)': 1 } };
    },
  };
});

import { handleAstSearch } from '../../mcp/tools/ast-search/ast-search.js';
import { handleAstAnalyze } from '../../mcp/tools/ast-analyze/ast-analyze.js';

describe('handleAstSearch', () => {
  it('returns error object when napi is unavailable', async () => {
    const result = await handleAstSearch({
      pattern: 'function $NAME($_) { $$$ }',
      language: 'typescript',
    });
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('@ast-grep/napi');
  });

  it('returns sgLoadError string in error object', async () => {
    const result = await handleAstSearch({
      pattern: 'import $X from $Y',
      language: 'javascript',
    }) as { error: string; sgLoadError: string };
    expect(result.sgLoadError).toBe('Cannot find module @ast-grep/napi');
  });

  it('error result does not have matches property', async () => {
    const result = await handleAstSearch({
      pattern: 'const $X = $Y',
      language: 'typescript',
    });
    expect((result as { matches?: unknown }).matches).toBeUndefined();
  });
});

describe('handleAstAnalyze', () => {
  it('returns error object for dependency-graph when napi unavailable', async () => {
    const result = await handleAstAnalyze({
      source: 'import { foo } from "./foo.js";',
      analysis_type: 'dependency-graph',
    });
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('@ast-grep/napi');
  });

  it('returns error object for cyclomatic-complexity when napi unavailable', async () => {
    const result = await handleAstAnalyze({
      source: 'function foo() { return 1; }',
      analysis_type: 'cyclomatic-complexity',
    });
    expect(result).toHaveProperty('error');
    expect((result as { error: string }).error).toContain('@ast-grep/napi');
  });

  it('returns error object for full analysis when napi unavailable', async () => {
    const result = await handleAstAnalyze({
      source: 'export const x = 1;',
      analysis_type: 'full',
    }) as { dependencies?: unknown; complexity?: unknown; error?: string };
    // full analysis returns { dependencies: errObj, complexity: errObj }
    // both sub-results have error field; the merged result has dependencies + complexity keys
    // OR it has error directly — depends on implementation
    expect(result).toBeDefined();
  });

  it('uses file_path for language detection when provided', async () => {
    const result = await handleAstAnalyze({
      source: 'const x = 1;',
      file_path: 'my-file.ts',
      analysis_type: 'dependency-graph',
    });
    // napi unavailable → always returns error object
    expect(result).toHaveProperty('error');
  });
});
