import { z } from 'zod';

import { ANALYSIS_CERTAINTIES } from '../../../constants/analysisCertainties.js';
import {
  FACTS_HASH_PREFIX,
  FACTS_REFERENCE_KINDS,
  FACTS_SCHEMA_VERSION,
  FACTS_TIERS,
} from '../../../constants/facts.js';
import { VERIFICATION_ROLES } from '../../../constants/mcpContracts.js';

/** A `sha256:<hex>` digest as every facts record spells it. */
const ContentHashSchema = z
  .string()
  .regex(new RegExp(`^${FACTS_HASH_PREFIX}[0-9a-f]{64}$`));

/** 1-based source line number. */
const LineSchema = z.number().int().positive();

/**
 * Where a provider resolved one reference.
 *
 * Only the `path` branch can carry a dependency edge, which is why every other
 * branch is informational to the rules that read facts.
 */
const ResolvedSchema = z.union([
  z.object({ path: z.string().min(1) }).strict(),
  z.object({ external: z.string().min(1) }).strict(),
  z.object({ unresolved: z.literal(true) }).strict(),
  z.object({ nonLiteral: z.literal(true) }).strict(),
]);

/**
 * One reference a provider reports.
 *
 * `line` and `candidateLines` are server-owned after acceptance: string-existence
 * checking rewrites both from the file's current bytes, so a submitted value for
 * either is replaced rather than trusted.
 */
const ReferenceSchema = z
  .object({
    specifier: z.string().min(1),
    sourceText: z.string().min(1).optional(),
    line: LineSchema.optional(),
    candidateLines: z.array(LineSchema).optional(),
    kind: z.nativeEnum(FACTS_REFERENCE_KINDS),
    certainty: z.literal(ANALYSIS_CERTAINTIES.INDETERMINATE).optional(),
    resolved: ResolvedSchema,
  })
  .strict();

/** One name a file's entry-point surface exports. */
const ExportedNameSchema = z
  .object({
    name: z.string().min(1),
    line: LineSchema.optional(),
    candidateLines: z.array(LineSchema).optional(),
  })
  .strict();

/** The tool run that produced a record, and what its resolution depended on. */
const ProvenanceSchema = z
  .object({
    tool: z.string().min(1),
    version: z.string().min(1),
    command: z.string(),
    tier: z.nativeEnum(FACTS_TIERS),
    resolutionInputs: z.array(
      z
        .object({ path: z.string().min(1), contentHash: ContentHashSchema })
        .strict(),
    ),
  })
  .strict();

/**
 * One file's facts, exactly as a provider submits them (spec §2.1).
 *
 * The schema is strict at every level: a misspelled field is rejected with its
 * JSON pointer rather than dropped, because a dropped `resolved` would narrow
 * the graph with no signal — the silent shrinking spec §2.4 forbids.
 */
export const FileFactsSchema = z
  .object({
    schemaVersion: z.literal(FACTS_SCHEMA_VERSION),
    path: z.string().min(1),
    contentHash: ContentHashSchema,
    references: z.array(ReferenceSchema),
    entrySurface: z
      .object({
        exportedNames: z.array(ExportedNameSchema),
        hasDirectDeclarations: z.boolean(),
        certainty: z.nativeEnum(ANALYSIS_CERTAINTIES),
      })
      .strict()
      .optional(),
    verification: z
      .object({
        role: z.enum([
          VERIFICATION_ROLES.SPEC_DOCUMENT,
          VERIFICATION_ROLES.TEST_RECORD,
          ANALYSIS_CERTAINTIES.UNSUPPORTED,
        ]),
        cases: z
          .object({
            certainty: z.nativeEnum(ANALYSIS_CERTAINTIES),
            exactCount: z.number().int().nonnegative().optional(),
            knownLowerBound: z.number().int().nonnegative(),
            reasons: z.array(z.string()),
          })
          .strict(),
      })
      .strict()
      .optional(),
    nonReferences: z
      .array(
        z
          .object({ line: LineSchema, reason: z.string().min(1) })
          .strict(),
      )
      .optional(),
    toolError: z
      .object({ message: z.string(), line: LineSchema.optional() })
      .strict()
      .optional(),
    provenance: ProvenanceSchema,
  })
  .strict();

/**
 * One line an attested record says is not a reference, and why.
 *
 * Only attested records need these: the accounting check asks every line that
 * looks like a reference to be explained, and a line no reference quotes is
 * explained here or the record is refused with that line's number.
 */
export type FactsNonReference = NonNullable<
  z.infer<typeof FileFactsSchema>['nonReferences']
>[number];

/** One file's facts as submitted and, after acceptance, as stored. */
export type FileFacts = z.infer<typeof FileFactsSchema>;

/** One reference inside a facts record. */
export type FactsReference = FileFacts['references'][number];

/** The tool run behind a facts record. */
export type FactsProvenance = FileFacts['provenance'];

/** Where a provider resolved one reference. */
export type FactsResolved = FactsReference['resolved'];
