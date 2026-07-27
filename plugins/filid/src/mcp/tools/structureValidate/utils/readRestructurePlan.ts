import { readUtf8FileIfExistsSync } from '@ogham/cross-platform/filesystem/read/utf8';
import { portableIsAbsolute } from '@ogham/cross-platform/paths';
import { z } from 'zod';

import { STRUCTURE_VALIDATION_ERROR_MESSAGES } from '../../../../constants/mcpContracts.js';
import {
  PLACEMENT_BASES,
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_SCHEMA_VERSION,
  RESTRUCTURE_UNIT_KINDS,
} from '../../../../constants/restructure.js';
import {
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../../../../constants/toolEnvelope.js';
import type { RestructurePlan } from '../../../../types/restructure.js';

const REQUIRED_ARTIFACT_SCHEMA = z.object({
  role: z.nativeEnum(REQUIRED_ARTIFACT_ROLES),
  path: z.string(),
  adapterId: z.string().optional(),
});

const IMPORT_REWRITE_SCHEMA = z.object({
  consumerPath: z.string(),
  currentSpecifier: z.string(),
  requiredSpecifier: z.string(),
});

const MOVE_INSTRUCTION_SCHEMA = z.object({
  sourcePath: z.string(),
  targetPath: z.string(),
  unitKind: z.nativeEnum(RESTRUCTURE_UNIT_KINDS),
  targetNodeType: z.nativeEnum(RESTRUCTURE_NODE_TYPES),
  basis: z.nativeEnum(PLACEMENT_BASES),
  consumerPaths: z.array(z.string()),
  lowestCommonFractalPath: z.string().optional(),
  reason: z.string(),
  requiredArtifacts: z.array(REQUIRED_ARTIFACT_SCHEMA),
  affectedImports: z.array(IMPORT_REWRITE_SCHEMA),
  requiresDecision: z.boolean(),
  decisionReasons: z.array(z.nativeEnum(RESTRUCTURE_DECISION_REASONS)),
});

const RESTRUCTURE_PLAN_SCHEMA = z.object({
  schemaVersion: z.literal(RESTRUCTURE_SCHEMA_VERSION),
  planId: z.string(),
  projectRoot: z.string(),
  snapshotHash: z.string(),
  createdAt: z.string(),
  moves: z.array(MOVE_INSTRUCTION_SCHEMA),
  unresolved: z.array(MOVE_INSTRUCTION_SCHEMA),
  summary: z.object({
    moveCount: z.number(),
    fractalsCreated: z.number(),
    organsCreated: z.number(),
    decisionsRequired: z.number(),
  }),
});

const TOOL_DIAGNOSTIC_SCHEMA = z.object({
  code: z.string(),
  message: z.string(),
  path: z.string().optional(),
});

const PERSISTED_PLAN_DATA_SCHEMA = z
  .object({
    projectRoot: z.string(),
    status: z.nativeEnum(TOOL_STATUSES),
    summary: z.unknown(),
    data: RESTRUCTURE_PLAN_SCHEMA,
    diagnostics: z.array(TOOL_DIAGNOSTIC_SCHEMA),
    persistence: z.nativeEnum(TOOL_PERSISTENCE).optional(),
  })
  .transform((payload) => payload.data);

const PLAN_ARTIFACT_SCHEMA = z.union([
  RESTRUCTURE_PLAN_SCHEMA,
  PERSISTED_PLAN_DATA_SCHEMA,
]);

export function readRestructurePlan(planPath: string): RestructurePlan {
  if (!portableIsAbsolute(planPath))
    throw new Error(STRUCTURE_VALIDATION_ERROR_MESSAGES.PLAN_PATH_ABSOLUTE);
  const source = readUtf8FileIfExistsSync(planPath);
  if (source === null)
    throw new Error(
      STRUCTURE_VALIDATION_ERROR_MESSAGES.PLAN_ARTIFACT_NOT_FOUND,
    );
  try {
    return PLAN_ARTIFACT_SCHEMA.parse(JSON.parse(source));
  } catch {
    throw new Error(STRUCTURE_VALIDATION_ERROR_MESSAGES.PLAN_ARTIFACT_INVALID);
  }
}
