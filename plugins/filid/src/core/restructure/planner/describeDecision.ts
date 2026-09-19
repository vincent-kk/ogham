import { RESTRUCTURE_DECISION_REASONS } from '../../../constants/restructure.js';
import type { AnalysisCertainty } from '../../../types/fractal.js';
import type {
  PlanningDecisionReason,
  RestructureDecision,
} from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

/** Evidence of one planned request that its decision sentences interpolate. */
export interface DecisionContext {
  /** Absolute project root of the snapshot. */
  projectRoot: string;
  /** Absolute source path of the request. */
  sourcePath: string;
  /** Fractal the unit is placed under: the consumers' lowest common fractal, else the source owner, else the root. */
  placementPath: string;
  /** Certainty of the snapshot's dependency graph. */
  graphCertainty: AnalysisCertainty;
  /** The request's organ name hint, when it gave one. */
  organNameHint?: string;
  /** Requested consumer paths ignored because no fractal owns them. */
  outsideConsumerPaths: string[];
  /** Module entry forms, relative to their fractal, found in the project. */
  entryForms: string[];
}

/** The human-readable half of a decision. */
type Sentences = Pick<RestructureDecision, 'message' | 'nextAction'>;

/** Sentence builders per planning decision reason; every reason has one, so the table is complete by type. */
const DECISION_SENTENCES: Record<
  PlanningDecisionReason,
  (context: DecisionContext) => Sentences
> = {
  [RESTRUCTURE_DECISION_REASONS.SOURCE_PATH_OUTSIDE_PROJECT]: (context) =>
    isAtOrWithin(context.projectRoot, context.sourcePath)
      ? {
          message: `No fractal owns ${context.sourcePath}: neither its directory nor any ancestor up to ${context.projectRoot} is a fractal, so filid has no owner to plan the move from.`,
          nextAction:
            'Give its directory or an ancestor an INTENT.md so a fractal owns it (the enrich-docs skill drafts one), or ask the user where the unit belongs; then create a new plan.',
        }
      : {
          message: `${context.sourcePath} is outside the project at ${context.projectRoot}, so filid cannot plan a move for it.`,
          nextAction: `Pass a sourcePath inside ${context.projectRoot}, relative to it or absolute, and create a new plan. If the unit belongs to another project, plan from that project's root.`,
        },
  [RESTRUCTURE_DECISION_REASONS.CONSUMER_PATH_OUTSIDE_PROJECT]: (context) => ({
    message: `These consumerPaths have no owning fractal in the project at ${context.projectRoot} and were ignored: ${context.outsideConsumerPaths.join(', ')}.`,
    nextAction: `Pass consumerPaths of files a fractal inside ${context.projectRoot} owns, or omit consumerPaths so the dependency graph supplies the consumers, and create a new plan.`,
  }),
  [RESTRUCTURE_DECISION_REASONS.CONSUMER_OWNER_REQUIRED]: (context) => ({
    message: `No consumer inside the project places ${context.sourcePath}: neither consumerPaths nor the dependency graph names a file that uses it.`,
    nextAction:
      'If nothing uses the unit, ask the user whether to delete it rather than move it. Otherwise pass the files that will use it as consumerPaths and create a new plan.',
  }),
  [RESTRUCTURE_DECISION_REASONS.DEPENDENCY_EVIDENCE_INDETERMINATE]: (
    context,
  ) => ({
    message: `The project's dependency graph is ${context.graphCertainty}, so the consumers found for ${context.sourcePath} may be incomplete; the envelope diagnostics say why.`,
    nextAction:
      "Follow each diagnostic's nextAction until the graph is exact, then create a new plan. Filid cannot verify a restructure while the graph is not exact, so passing consumerPaths alone does not unblock it.",
  }),
  [RESTRUCTURE_DECISION_REASONS.CONTRACT_INTENT_UNKNOWN]: (context) => ({
    message: `Filid cannot tell whether ${context.sourcePath} is internal to its consumers or an independent module: the request gave no contractIntent, and the unit is not already a fractal with INTENT.md, DETAIL.md and an entry point.`,
    nextAction:
      'Decide from the unit\'s documents and how it is used — never from its name — and create a new plan with contractIntent "internal" (an organ its consumers own) or "independent" (its own fractal). If the evidence does not settle it, ask the user.',
  }),
  [RESTRUCTURE_DECISION_REASONS.ORGAN_NAME_REQUIRED]: (context) => ({
    message: `${context.sourcePath} becomes an organ under ${context.placementPath}, and nothing in the request names that organ.`,
    nextAction:
      "Create a new plan with organNameHint set to a directory name for the unit's responsibility — never a grab-bag such as shared, common or misc. If no such name is evident, ask the user for one.",
  }),
  [RESTRUCTURE_DECISION_REASONS.INVALID_NAME_HINT]: (context) => ({
    message: `organNameHint "${context.organNameHint ?? ''}" is not a single directory name.`,
    nextAction:
      'Pass one path segment — no separator, not "." or "..", not absolute — and create a new plan.',
  }),
  [RESTRUCTURE_DECISION_REASONS.ENTRY_POINT_EVIDENCE_REQUIRED]: (context) =>
    context.entryForms.length > 0
      ? {
          message: `${context.sourcePath} becomes a fractal under ${context.placementPath}, but existing fractals use ${context.entryForms.length} entry file forms (${context.entryForms.join(', ')}), so filid cannot choose the new entry file.`,
          nextAction:
            'Filid cannot plan this move while the entry form is ambiguous. Report it to the user; if the unit needs no public boundary of its own, the user may choose contractIntent "internal", which needs no entry file.',
        }
      : {
          message: `${context.sourcePath} becomes a fractal under ${context.placementPath}, but no fractal in the project has a module entry file whose form filid could copy.`,
          nextAction:
            'Filid cannot plan this move without an entry form to copy. Report it to the user; if the unit needs no public boundary of its own, the user may choose contractIntent "internal", which needs no entry file.',
        },
};

/**
 * Explain one decision reason a request's own evidence raised.
 * @param reason - Any decision reason except `move-order-conflict`, which the ordering step explains
 * @param context - The request's paths and the evidence its sentences name
 * @returns The reason with a message naming what blocks the request and the caller's next action
 */
export function describeDecision(
  reason: PlanningDecisionReason,
  context: DecisionContext,
): RestructureDecision {
  return { reason, ...DECISION_SENTENCES[reason](context) };
}
