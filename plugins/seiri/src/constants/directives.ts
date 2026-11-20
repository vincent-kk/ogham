/** Connection record kept beside the directive files it governs. */
export const DIRECTIVE_BINDING_FILE = 'binding.json';

/** Directory lock serializing changes to a set's connection. */
export const DIRECTIVE_LOCK_DIR = 'binding.lock';

/** Maximum SessionStart context, in Claude characters or Codex UTF-8 bytes. */
export const DIRECTIVES_CONTEXT_LIMIT = { claude: 9000, codex: 4000 } as const;
