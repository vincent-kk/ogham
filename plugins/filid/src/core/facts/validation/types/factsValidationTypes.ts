import type { FACTS_REJECTION_CODES } from '../../../../constants/facts.js';
import type { FileFacts } from '../../schema/fileFactsSchema.js';

/** One record or reference filid would not store, and what to do about it. */
export interface FactsRejection {
  /** Project-relative path of the record the rejection belongs to. */
  path: string;
  /** JSON pointer into the submitted document, so the caller can find it. */
  pointer: string;
  /** Stable reason code. */
  code: (typeof FACTS_REJECTION_CODES)[keyof typeof FACTS_REJECTION_CODES];
  /** What the caller does next to change this outcome. */
  nextAction: string;
  /** The reference's specifier, on a reference-level rejection. */
  specifier?: string;
  /**
   * The declared resolution input that caused the rejection.
   *
   * The path only — never anything read from that file.
   */
  inputPath?: string;
}

/** What one record's validation needs to know about the project around it. */
export interface FactsValidationContext {
  /** Absolute project root every path is judged against. */
  projectRoot: string;
  /** Paths the scan reports, which decide `external` versus an internal edge. */
  scannedPaths: ReadonlySet<string>;
  /**
   * Whether a project-relative path is inside the declared facts scope.
   * @param relativePath Path to test.
   * @returns True when the path is covered.
   */
  inScope: (relativePath: string) => boolean;
  /**
   * Hash one path a record declared as a resolution input.
   * @param path Declared path, absolute or project-relative.
   * @returns `sha256:<hex>`, or null when filid will not read that file.
   */
  hashDeclaredInput: (path: string) => string | null;
}

/** The outcome of checking one submitted record. */
export interface FactsValidationResult {
  /** The record as it will be stored, or null when the record was rejected. */
  accepted: FileFacts | null;
  /** Every record-level and reference-level rejection this record produced. */
  rejections: FactsRejection[];
}
