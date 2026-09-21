import {
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
  portableResolve,
  readUtf8FileIfExistsSync,
} from '@ogham/cross-platform';
import { z } from 'zod';

import { RESTRUCTURE_PLAN_ERROR_CODES } from '../../../../constants/mcpContracts.js';
import { PORTABLE_PATH_MARKERS } from '../../../../constants/pathMarkers.js';
import {
  PLACEMENT_BASES,
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_PLAN_ERROR_NEXT_ACTIONS,
  RESTRUCTURE_SCHEMA_VERSION,
  RESTRUCTURE_UNIT_KINDS,
} from '../../../../constants/restructure.js';
import {
  TOOL_PERSISTENCE,
  TOOL_STATUSES,
} from '../../../../constants/toolEnvelope.js';
import { isPhysicallyWithin } from '../../../../core/restructure/index.js';
import type { RestructurePlan } from '../../../../types/restructure.js';
import { ToolDiagnosticError } from '../../../errors/toolDiagnosticError.js';

import { isStoredPlanArtifact } from './isStoredPlanArtifact.js';

const REQUIRED_ARTIFACT_SCHEMA = z.object({
  role: z.nativeEnum(REQUIRED_ARTIFACT_ROLES),
  path: z.string(),
  adapterId: z.string().optional(),
});

const IMPORT_REQUIREMENT_SCHEMA = z.object({
  consumerPath: z.string(),
  currentSpecifier: z.string(),
  requiredResolvedPath: z.string(),
  suggestedSpecifier: z.string().optional(),
});

const RESTRUCTURE_DECISION_SCHEMA = z.object({
  reason: z.nativeEnum(RESTRUCTURE_DECISION_REASONS),
  message: z.string(),
  nextAction: z.string(),
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
  affectedImports: z.array(IMPORT_REQUIREMENT_SCHEMA),
  preservedImports: z.array(IMPORT_REQUIREMENT_SCHEMA),
  requiresDecision: z.boolean(),
  decisionReasons: z.array(z.nativeEnum(RESTRUCTURE_DECISION_REASONS)),
  decisions: z.array(RESTRUCTURE_DECISION_SCHEMA),
});

/**
 * Whether an artifact path lies at or inside the plan's project root, judged on the path string.
 * @param projectRoot - Absolute project root the plan names
 * @param path - Path listed by the plan
 * @returns True for an absolute path that does not climb out of the root
 */
function staysInsideRoot(projectRoot: string, path: string): boolean {
  if (!portableIsAbsolute(path)) return false;
  const relative = portableRelative(projectRoot, path);
  const comparable = pathForCompare(relative);
  return (
    !portableIsAbsolute(relative) &&
    comparable !== PORTABLE_PATH_MARKERS.PARENT &&
    !comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX)
  );
}

const UNKNOWN_FILE_SCHEMA = z.object({
  path: z.string(),
  causes: z.array(z.string()),
});

const PLAN_BASELINE_SCHEMA = z.object({
  cycles: z.array(z.array(z.string())),
  boundaryViolations: z.array(
    z.object({
      ruleId: z.string(),
      consumerPath: z.string(),
      importedPath: z.string(),
    }),
  ),
});

const RESTRUCTURE_PLAN_SCHEMA = z
  .object({
    schemaVersion: z.literal(RESTRUCTURE_SCHEMA_VERSION),
    planId: z.string(),
    projectRoot: z.string(),
    snapshotHash: z.string(),
    readPaths: z.array(z.string()),
    probePaths: z.array(z.string()),
    readHash: z.string(),
    createdAt: z.string(),
    moves: z.array(MOVE_INSTRUCTION_SCHEMA),
    alreadyPlaced: z.array(MOVE_INSTRUCTION_SCHEMA).default([]),
    unresolved: z.array(MOVE_INSTRUCTION_SCHEMA),
    unknownFiles: z.object({
      relevant: z.array(UNKNOWN_FILE_SCHEMA),
      other: z.array(UNKNOWN_FILE_SCHEMA),
    }),
    baseline: PLAN_BASELINE_SCHEMA,
    summary: z.object({
      moveCount: z.number(),
      fractalsCreated: z.number(),
      organsCreated: z.number(),
      alreadyPlacedCount: z.number().default(0),
      decisionsRequired: z.number(),
      affectedImportCount: z.number(),
    }),
  })
  .superRefine((plan, context) => {
    if (!portableIsAbsolute(plan.projectRoot))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['projectRoot'],
        message: 'projectRoot is not an absolute path.',
      });
    const listed: [string, (string | number)[]][] = [
      ...plan.readPaths.map((path, index): [string, (string | number)[]] => [
        path,
        ['readPaths', index],
      ]),
      ...plan.probePaths.map((path, index): [string, (string | number)[]] => [
        path,
        ['probePaths', index],
      ]),
      ...plan.baseline.cycles.flatMap((route, cycle) =>
        route.map((path, index): [string, (string | number)[]] => [
          path,
          ['baseline', 'cycles', cycle, index],
        ]),
      ),
      ...plan.baseline.boundaryViolations.flatMap((violation, index) =>
        (['consumerPath', 'importedPath'] as const).map(
          (key): [string, (string | number)[]] => [
            violation[key],
            ['baseline', 'boundaryViolations', index, key],
          ],
        ),
      ),
      ...(['relevant', 'other'] as const).flatMap((group) =>
        plan.unknownFiles[group].map(
          (file, index): [string, (string | number)[]] => [
            portableResolve(plan.projectRoot, file.path),
            ['unknownFiles', group, index, 'path'],
          ],
        ),
      ),
    ];
    for (const [path, issuePath] of listed)
      if (!staysInsideRoot(plan.projectRoot, path))
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: issuePath,
          message: `${issuePath.join('.')} lists a path outside projectRoot.`,
        });
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

/**
 * Reads and validates either a bare plan or a persisted plan tool payload.
 *
 * @param planPath - Absolute machine path to the JSON artifact.
 * @returns The validated restructure plan contained by the artifact.
 * @throws {ToolDiagnosticError} `plan-path-not-absolute` for a relative path,
 * `plan-artifact-not-found` when no file exists there, and
 * `plan-artifact-invalid` when the file is not an artifact the plan action
 * stored unchanged (outside the restructure store, or content not matching its
 * digest name), is not a plan of this schema version, or lists a path outside
 * its project root — by the path string, or through a symbolic link — so no
 * such path is ever opened.
 */
export function readRestructurePlan(planPath: string): RestructurePlan {
  if (!portableIsAbsolute(planPath))
    throw new ToolDiagnosticError(
      RESTRUCTURE_PLAN_ERROR_CODES.PLAN_PATH_NOT_ABSOLUTE,
      `planPath "${planPath}" is not an absolute path.`,
      RESTRUCTURE_PLAN_ERROR_NEXT_ACTIONS.PLAN_PATH_NOT_ABSOLUTE,
    );
  const source = readUtf8FileIfExistsSync(planPath);
  if (source === null)
    throw new ToolDiagnosticError(
      RESTRUCTURE_PLAN_ERROR_CODES.PLAN_ARTIFACT_NOT_FOUND,
      `No plan artifact exists at ${planPath}.`,
      RESTRUCTURE_PLAN_ERROR_NEXT_ACTIONS.PLAN_ARTIFACT_NOT_FOUND,
    );
  if (!isStoredPlanArtifact(planPath, source))
    throw new ToolDiagnosticError(
      RESTRUCTURE_PLAN_ERROR_CODES.PLAN_ARTIFACT_INVALID,
      `${planPath} is not a plan artifact as the plan action stored it: it lies outside the restructure artifact store, or its content no longer matches its digest name.`,
      RESTRUCTURE_PLAN_ERROR_NEXT_ACTIONS.PLAN_ARTIFACT_UNTRUSTED,
    );
  let plan: RestructurePlan;
  try {
    plan = PLAN_ARTIFACT_SCHEMA.parse(JSON.parse(source));
  } catch (error) {
    throw new ToolDiagnosticError(
      RESTRUCTURE_PLAN_ERROR_CODES.PLAN_ARTIFACT_INVALID,
      `${planPath} does not hold a restructure plan this filid version reads.`,
      RESTRUCTURE_PLAN_ERROR_NEXT_ACTIONS.PLAN_ARTIFACT_INVALID,
      { cause: error },
    );
  }
  if (
    [...plan.readPaths, ...plan.probePaths].some(
      (path) => !isPhysicallyWithin(plan.projectRoot, path),
    )
  )
    throw new ToolDiagnosticError(
      RESTRUCTURE_PLAN_ERROR_CODES.PLAN_ARTIFACT_INVALID,
      `${planPath} lists a path whose symbolic links lead outside ${plan.projectRoot}.`,
      RESTRUCTURE_PLAN_ERROR_NEXT_ACTIONS.PLAN_ARTIFACT_INVALID,
    );
  return plan;
}
