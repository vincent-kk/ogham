/**
 * INTENT.md / DETAIL.md document schema type definitions
 */

/** INTENT.md 3-tier boundary system */
export interface ThreeTierBoundary {
  /** Rules that must always be followed */
  alwaysDo: string[];
  /** Rules that require confirmation first */
  askFirst: string[];
  /** Rules that must never be violated */
  neverDo: string[];
}

/** INTENT.md document structure */
export interface IntentMdSchema {
  /** Fractal name */
  name: string;
  /** 1-2 line purpose description */
  purpose: string;
  /** Executable commands */
  commands: Record<string, string>;
  /** Key file/directory structure */
  structure: Record<string, string>;
  /** 3-tier boundary rules */
  boundaries: ThreeTierBoundary;
  /** Sibling fractal INTENT.md references */
  dependencies: string[];
  /** Total line count */
  lineCount: number;
}

/** @deprecated Use IntentMdSchema instead. Will be removed in v0.2.0 */
export type ClaudeMdSchema = IntentMdSchema;

/** DETAIL.md document structure */
export interface DetailMdSchema {
  /** Module specification title */
  title: string;
  /** Functional requirements */
  requirements: string[];
  /** API interface definitions */
  apiContracts: string[];
  /** Last updated timestamp */
  lastUpdated: string;
  /** Compression metadata */
  compressionMeta?: CompressionMeta;
}

/** @deprecated Use DetailMdSchema instead. Will be removed in v0.2.0 */
export type SpecMdSchema = DetailMdSchema;

/** Compression metadata */
export interface CompressionMeta {
  /** Compression method */
  method: 'reversible' | 'lossy';
  /** Original line count */
  originalLines: number;
  /** Compressed line count */
  compressedLines: number;
  /** Compression timestamp */
  timestamp: string;
  /** Whether original can be recovered */
  recoverable: boolean;
}

/** INTENT.md validation result */
export interface IntentMdValidation {
  /** Whether valid */
  valid: boolean;
  /** List of violations */
  violations: DocumentViolation[];
}

/** @deprecated Use IntentMdValidation instead. Will be removed in v0.2.0 */
export type ClaudeMdValidation = IntentMdValidation;

/** DETAIL.md validation result */
export interface DetailMdValidation {
  /** Whether valid */
  valid: boolean;
  /** List of violations */
  violations: DocumentViolation[];
}

/** @deprecated Use DetailMdValidation instead. Will be removed in v0.2.0 */
export type SpecMdValidation = DetailMdValidation;

/** Document rule violation */
export interface DocumentViolation {
  /** Violated rule */
  rule:
    | 'line-limit'
    | 'deduplication'
    | 'append-only'
    | 'missing-boundaries'
    | 'missing-section';
  /** Violation description */
  message: string;
  /** Severity level */
  severity: 'error' | 'warning';
}
