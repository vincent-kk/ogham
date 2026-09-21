/** Certainty of one axis of a record: `indeterminate` and `unsupported` are never a pass. */
export type FactsCertainty = 'exact' | 'indeterminate' | 'unsupported';

/** Where a reference loads from, as the adapter resolved it. */
export type ReferenceResolution =
  | { path: string }
  | { external: string }
  | { unresolved: true }
  | { nonLiteral: true };

/** One reference a file makes (spec §2.1). */
export interface Reference {
  /** Specifier text as the adapter read it. */
  specifier: string;
  /** The literal as the source spells it, delimiters included, when escapes make it differ from `specifier`; the server checks this text against the file's bytes. */
  sourceText?: string;
  /** 1-based line; the adapter sets it on `indeterminate` references. */
  line?: number;
  kind: 'static' | 'dynamic' | 're-export' | 'framework';
  /** Present when the tool could not confirm the reference is code; absent means exact. */
  certainty?: 'indeterminate';
  /** Project-relative POSIX `path`, or unresolved. */
  resolved: ReferenceResolution;
}

/** One name an entry point exports. */
export interface ExportedName {
  name: string;
  line?: number;
}

/** What produced a record and which configuration its resolution read. */
export interface FactsProvenance {
  tool: string;
  version: string;
  /** Arguments of the run, with machine-specific absolute paths normalized. */
  command: string;
  tier: 'tool' | 'attested';
  resolutionInputs: { path: string; contentHash: string }[];
}

/** The facts of one file (spec §2.1). */
export interface FileFacts {
  schemaVersion: 1;
  /** Project-relative POSIX path. */
  path: string;
  /** `sha256:<hex>` of the file bytes. */
  contentHash: string;
  references: Reference[];
  entrySurface?: {
    exportedNames: ExportedName[];
    hasDirectDeclarations: boolean;
    certainty: FactsCertainty;
  };
  verification?: {
    role: 'spec-document' | 'test-record' | 'unsupported';
    cases: {
      certainty: FactsCertainty;
      exactCount?: number;
      knownLowerBound: number;
      reasons: string[];
    };
    /** `filid:contract` group ids the file's comments declare, deduplicated. */
    contractGroupIds: string[];
  };
  /** Lines an attested record says are not references, with the reason each is not. */
  nonReferences?: { line: number; reason: string }[];
  /** Why the adapter failed on the file's bytes; its other axes are empty. */
  toolError?: { message: string; line?: number };
  provenance: FactsProvenance;
}

/** Why a requested path produced no record. */
export type RejectionReason =
  'outside-project' | 'missing' | 'not-a-file' | 'symlink';

/** Records of one extraction, and the requested paths it refused. */
export interface FileFactsExtraction {
  /** One record per accepted file, sorted by path. */
  records: FileFacts[];
  /** Refused paths in request order, as given. */
  rejected: { path: string; reason: RejectionReason }[];
  /** Project-relative paths of accepted files whose bytes could not be read, sorted; they have no record. */
  unreadable: string[];
}
