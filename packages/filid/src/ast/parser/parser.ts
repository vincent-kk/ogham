/**
 * Shared AST utilities using @ast-grep/napi (tree-sitter backend).
 * Provides source parsing and tree traversal for all analysis modules.
 */
export { parseSource } from './parseSource.js';
export { parseFile } from './parseFile.js';
export { walk } from './walk.js';
