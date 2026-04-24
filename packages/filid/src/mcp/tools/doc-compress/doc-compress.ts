import type {
  ToolCallEntry,
  ToolCallSummary,
} from '../../../compress/lossy-summarizer/lossy-summarizer.js';
import type { CompressionMeta } from '../../../types/documents.js';

import { handleLossy } from './utils/handle-lossy.js';
import { handleReversible } from './utils/handle-reversible.js';
import { inferMode } from './utils/infer-mode.js';

/** Input for doc-compress tool */
export interface DocCompressInput {
  /** Compression mode */
  mode: 'reversible' | 'lossy' | 'auto';
  /** File path (for reversible mode) */
  filePath?: string;
  /** File content (for reversible mode) */
  content?: string;
  /** Exported symbols (for reversible mode) */
  exports?: string[];
  /** Tool call entries (for lossy mode) */
  toolCallEntries?: ToolCallEntry[];
}

/** Output of doc-compress tool */
export interface DocCompressOutput {
  /** Compacted reference string (reversible) */
  compacted?: string;
  /** Lossy summary */
  summary?: ToolCallSummary;
  /** Compression metadata */
  meta?: CompressionMeta;
  /** Error message */
  error?: string;
}

/**
 * Handle doc-compress MCP tool calls.
 *
 * Modes:
 * - reversible: Compact file into path+metadata reference
 * - lossy: Merge tool call history into statistics
 * - auto: Choose based on available input data
 */
export function handleDocCompress(input: DocCompressInput): DocCompressOutput {
  const effectiveMode = input.mode === 'auto' ? inferMode(input) : input.mode;

  switch (effectiveMode) {
    case 'reversible':
      return handleReversible(input);
    case 'lossy':
      return handleLossy(input);
    default:
      return { error: `Cannot determine compression mode` };
  }
}
