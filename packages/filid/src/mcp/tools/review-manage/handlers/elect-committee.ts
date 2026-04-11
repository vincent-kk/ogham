import type {
  CommitteeElection,
  Complexity,
  PersonaId,
} from '../../../../types/review.js';
import type { ReviewManageInput } from '../review-manage.js';

export async function handleElectCommittee(
  input: ReviewManageInput,
): Promise<Record<string, unknown>> {
  if (input.changedFilesCount === undefined) {
    throw new Error('changedFilesCount is required for elect-committee action');
  }
  if (input.changedFractalsCount === undefined) {
    throw new Error(
      'changedFractalsCount is required for elect-committee action',
    );
  }
  if (input.hasInterfaceChanges === undefined) {
    throw new Error(
      'hasInterfaceChanges is required for elect-committee action',
    );
  }

  const {
    changedFilesCount,
    changedFractalsCount,
    hasInterfaceChanges,
    adjudicatorMode,
  } = input;

  // Solo mode short-circuits complexity calculation and returns the
  // integrated adjudicator fast-path agent.
  if (adjudicatorMode) {
    const result: CommitteeElection = {
      complexity: 'TRIVIAL',
      committee: ['adjudicator'],
      adversarialPairs: [],
    };
    return result as unknown as Record<string, unknown>;
  }

  let complexity: Complexity;
  if (
    changedFilesCount <= 1 &&
    changedFractalsCount <= 1 &&
    !hasInterfaceChanges
  ) {
    complexity = 'TRIVIAL';
  } else if (
    changedFilesCount <= 3 &&
    changedFractalsCount <= 1 &&
    !hasInterfaceChanges
  ) {
    complexity = 'LOW';
  } else if (changedFilesCount > 10 || changedFractalsCount >= 4) {
    complexity = 'HIGH';
  } else {
    complexity = 'MEDIUM';
  }

  let committee: PersonaId[];
  if (complexity === 'TRIVIAL') {
    // TRIVIAL auto-tier also uses the integrated adjudicator — the
    // diff is small enough that adversarial multi-persona debate has
    // no marginal value over a single fast-path pass.
    committee = ['adjudicator'];
  } else if (complexity === 'LOW') {
    committee = ['engineering-architect', 'operations-sre'];
  } else if (complexity === 'MEDIUM') {
    committee = [
      'engineering-architect',
      'knowledge-manager',
      'business-driver',
      'operations-sre',
    ];
  } else {
    committee = [
      'engineering-architect',
      'knowledge-manager',
      'operations-sre',
      'business-driver',
      'product-manager',
      'design-hci',
    ];
  }

  const adversarialPairs: [PersonaId, PersonaId[]][] = [];

  if (committee.includes('business-driver')) {
    const challengers: PersonaId[] = [];
    if (committee.includes('knowledge-manager'))
      challengers.push('knowledge-manager');
    if (committee.includes('operations-sre'))
      challengers.push('operations-sre');
    if (challengers.length > 0) {
      adversarialPairs.push(['business-driver', challengers]);
    }
  }

  if (committee.includes('product-manager')) {
    const challengers: PersonaId[] = [];
    if (committee.includes('engineering-architect'))
      challengers.push('engineering-architect');
    if (challengers.length > 0) {
      adversarialPairs.push(['product-manager', challengers]);
    }
  }

  if (committee.includes('design-hci')) {
    const challengers: PersonaId[] = [];
    if (committee.includes('engineering-architect'))
      challengers.push('engineering-architect');
    if (challengers.length > 0) {
      adversarialPairs.push(['design-hci', challengers]);
    }
  }

  const result: CommitteeElection = {
    complexity,
    committee,
    adversarialPairs,
  };
  return result as unknown as Record<string, unknown>;
}
