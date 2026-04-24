/**
 * Shared AST utilities using @ast-grep/napi (tree-sitter backend).
 * Provides source parsing and tree traversal for all analysis modules.
 */
export { parseSource } from './parse-source.js';
export { parseFile } from './parse-file.js';
export { walk } from './walk.js';
