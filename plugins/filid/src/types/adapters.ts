import type { AnalysisCertainty, EntryPointDescriptor } from './fractal.js';

export type { AnalysisCertainty } from './fractal.js';
export type VerificationRole = 'spec-document' | 'test-record';

export interface AdapterClaim {
  confidence: number;
  evidence: string[];
}

export interface DependencyReference {
  sourceFile: string;
  rawSpecifier: string;
  resolvedPath: string | null;
  kind: 'static' | 'dynamic' | 're-export' | 'framework';
  /**
   * `indeterminate` when the adapter found the reference where it could not
   * trust token boundaries, so it may not be code at all. Omitted means exact.
   */
  certainty?: AnalysisCertainty;
  /** 1-based line of the reference; set on `indeterminate` references so a reader can check that line. */
  line?: number;
}

export interface EntryPointInspection {
  entryPoint: EntryPointDescriptor;
  exportedNames: string[];
  hasDirectDeclarations: boolean;
  certainty: AnalysisCertainty;
}

export interface StructureAdapter {
  id: string;
  detect(projectRoot: string): Promise<AdapterClaim>;
  discoverSourceFiles(projectRoot: string): Promise<string[]>;
  /**
   * Source files and, from the same walk, the symbolic links discovery skipped
   * whose real location is outside `projectRoot`; `files` equals
   * `discoverSourceFiles`. Optional: an adapter that follows or never meets
   * links omits it, and ownership then calls `discoverSourceFiles`.
   */
  discoverSourceTree?(
    projectRoot: string,
  ): Promise<{ files: string[]; unfollowedLinks: string[] }>;
  findEntryPoints(
    directoryPath: string,
    overrides?: readonly string[],
  ): Promise<EntryPointDescriptor[]>;
  inspectEntryPoint(entryPointPath: string): Promise<EntryPointInspection>;
  extractDependencies(filePath: string): Promise<DependencyReference[]>;
  isFrameworkOwnedPeer(filePath: string): Promise<boolean>;
  suggestEntryPointPath(directoryPath: string): Promise<string>;
}

export interface VerificationCaseCount {
  certainty: AnalysisCertainty;
  exactCount?: number;
  knownLowerBound: number;
  reasons: string[];
}

export interface VerificationAdapter {
  id: string;
  detect(projectRoot: string): Promise<AdapterClaim>;
  discover(projectRoot: string): Promise<string[]>;
  classify(filePath: string): Promise<VerificationRole | 'unsupported'>;
  count(filePath: string): Promise<VerificationCaseCount>;
  extractContractGroupIds(filePath: string): Promise<string[]>;
}

export interface AdapterDiagnostic {
  code: 'ambiguous-adapter-claim' | 'unsupported' | 'unknown-adapter-id';
  message: string;
  path?: string;
  adapterIds?: string[];
  /** What the caller does next; carried into the snapshot diagnostic. */
  nextAction: string;
}

export interface AdapterOwnership {
  adapter: StructureAdapter;
  claim: AdapterClaim;
}

export interface AdapterResolution {
  adapters: StructureAdapter[];
  claims: Map<string, AdapterClaim>;
  ownership: Map<string, AdapterOwnership>;
  unsupportedPaths: string[];
  /** Symbolic links discovery did not follow whose real location is outside the root; sorted. */
  unfollowedLinks: string[];
  diagnostics: AdapterDiagnostic[];
}

export interface AdapterRegistry {
  registerStructure(adapter: StructureAdapter): void;
  registerVerification(adapter: VerificationAdapter): void;
  selectStructure(enabledIds?: readonly string[]): StructureAdapter[];
  selectVerification(enabledIds?: readonly string[]): VerificationAdapter[];
  resolveStructure(
    projectRoot: string,
    enabledIds?: readonly string[],
  ): Promise<StructureAdapter[]>;
  resolveVerification(
    projectRoot: string,
    enabledIds?: readonly string[],
  ): Promise<VerificationAdapter[]>;
  structureIds(): string[];
  verificationIds(): string[];
}
