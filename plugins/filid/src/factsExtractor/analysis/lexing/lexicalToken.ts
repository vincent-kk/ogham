/** Kind of a lexical token; comments and whitespace produce none. */
export type LexicalTokenKind =
  'identifier' | 'number' | 'punctuation' | 'regex' | 'string' | 'template';

/** One token of the ECMAScript lexical scan, with the delimiter depth it opened at. */
export interface LexicalToken {
  kind: LexicalTokenKind;
  /** Source text; for strings and templates, the escape-reduced body. */
  value: string;
  /** Offset of the first character. */
  start: number;
  /** Offset just past the last character, or where reading stopped. */
  end: number;
  parenDepth: number;
  braceDepth: number;
  bracketDepth: number;
  /** Set on a string or template the source never closes: every later token boundary is a guess. */
  unterminated?: true;
}

/** Tokens read from one range of a source, and whether that range can be trusted. */
export interface TokenRange {
  /** Tokens in source order. */
  tokens: LexicalToken[];
  /** Offset just past the range: past the closing `}` when `closed`, otherwise the source end. */
  end: number;
  /** Whether an unmatched `}` ended the range; never true for an unbounded scan. */
  closed: boolean;
  /** Whether a block comment ran to the end of the source. */
  unclosedComment: boolean;
}
