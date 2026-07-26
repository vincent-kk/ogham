import type { EntryPointDescriptor } from './fractal.js';

export type AnalysisCertainty = 'exact' | 'indeterminate' | 'unsupported';
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
  findEntryPoints(directoryPath: string): Promise<EntryPointDescriptor[]>;
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
  diagnostics: AdapterDiagnostic[];
}

export interface AdapterRegistry {
  registerStructure(adapter: StructureAdapter): void;
  registerVerification(adapter: VerificationAdapter): void;
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
