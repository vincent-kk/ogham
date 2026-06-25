import type {
  AssertSeverity,
  AssumptionId,
  ExecutionMode,
  MethodFamily,
  OutcomeType,
  Severity,
} from "./enums.js";

/** The chosen method under evaluation. */
export interface AssertMethod {
  technique: string;
  family: MethodFamily;
  paired?: boolean;
}

/** Normalized dataset facts (no natural language — deterministic fields). */
export interface AssertDatasetMeta {
  outcomeType: OutcomeType;
  groupCount?: number;
  sampleSize?: number;
  expectedCountsBelow5?: boolean;
  eventsPerVariable?: number;
}

/** One assumption-check artifact fed into the gate. */
export interface AssumptionArtifact {
  assumptionId: AssumptionId;
  artifactPath: string;
  passed: boolean;
}

/** assert_analysis_plan input contract. */
export interface AssertInput {
  method: AssertMethod;
  datasetMeta: AssertDatasetMeta;
  assumptionArtifacts?: AssumptionArtifact[];
  mode: ExecutionMode;
}

/** A single triggered rule reason. */
export interface AssertReason {
  code: string;
  severity: Severity;
  message: string;
}

/** assert_analysis_plan output contract. */
export interface AssertOutput {
  allowed: boolean;
  severity: AssertSeverity;
  reasons: AssertReason[];
  recommendedAlternatives?: string[];
}

/** A required-assumption declaration parsed from methods/{technique}/meta.yaml. */
export interface MethodAssumption {
  id: AssumptionId;
  severity: Severity;
  check: string;
  recommend?: string[];
}

/** Parsed methods/{technique}/meta.yaml shape (consumed by the gate). */
export interface MethodMeta {
  technique: string;
  family: MethodFamily;
  outcomeTypes: OutcomeType[];
  requiredAssumptions: MethodAssumption[];
  hardRules: string[];
  requiredArtifacts: string[];
  packages: string[];
}
