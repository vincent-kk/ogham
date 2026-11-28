/** Connection record kept beside the directive files it governs. */
export const DIRECTIVE_BINDING_FILE = 'binding.json';

/** Directory lock serializing changes to a set's connection. */
export const DIRECTIVE_LOCK_DIR = 'binding.lock';

/**
 * Maximum SessionStart context, in Claude characters or Codex UTF-8 bytes.
 * The Codex value stays under the 10,000-byte threshold above which Codex
 * spills hook output to a temporary file.
 */
export const DIRECTIVES_CONTEXT_LIMIT = { claude: 9000, codex: 9000 } as const;

/** Entry document whose presence makes a directive set structured. */
export const DIRECTIVE_INDEX_FILE = 'index.md';

/** Maximum UTF-8 bytes of each size-limited document, identical on every host. */
export const DIRECTIVE_DOCUMENT_LIMITS = {
  'index.md': 4000,
  'principles.md': 10000,
  'dashboard.md': 3000,
} as const;

/** Documents a structured set asks the agent to read right after compaction. */
export const DIRECTIVE_REQUIRED_READS = [
  'principles.md',
  'dashboard.md',
  'notepad.jsonl',
] as const;

/**
 * Markdown documents the entry template names whether or not the set has
 * them yet; a set creates each one when it first needs it, so their absence
 * is not a violation.
 */
export const DIRECTIVE_OPTIONAL_DOCUMENTS: readonly string[] = [
  'principles.md',
  'dashboard.md',
  'orchestration.md',
];

/** Append-only JSON Lines records kept in a structured set. */
export const DIRECTIVE_LOG_FILES = {
  notepad: 'notepad.jsonl',
  history: 'history.jsonl',
} as const;
