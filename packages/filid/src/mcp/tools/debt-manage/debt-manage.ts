import type {
  BiasResult,
  DebtItem,
  DebtItemCreate,
} from '../../../types/debt.js';
import { handleCalculateBias } from './handlers/handle-calculate-bias.js';
import { handleCreate } from './handlers/handle-create.js';
import { handleList } from './handlers/handle-list.js';
import { handleResolve } from './handlers/handle-resolve.js';

export interface DebtManageInput {
  action: 'create' | 'list' | 'resolve' | 'calculate-bias';
  projectRoot: string;
  debtItem?: DebtItemCreate;
  fractalPath?: string;
  debtId?: string;
  debts?: DebtItem[];
  changedFractalPaths?: string[];
  currentCommitSha?: string;
}

export async function handleDebtManage(
  args: unknown,
): Promise<
  | { filePath: string; id: string }
  | { debts: DebtItem[]; totalWeight: number }
  | { deleted: boolean }
  | BiasResult
> {
  const input = args as DebtManageInput;

  if (!input.action) {
    throw new Error('action is required');
  }
  if (!input.projectRoot) {
    throw new Error('projectRoot is required');
  }

  switch (input.action) {
    case 'create': {
      if (!input.debtItem) {
        throw new Error('debtItem is required for create action');
      }
      return handleCreate(input.projectRoot, input.debtItem);
    }
    case 'list': {
      return handleList(input.projectRoot, input.fractalPath);
    }
    case 'resolve': {
      if (!input.debtId) {
        throw new Error('debtId is required for resolve action');
      }
      return handleResolve(input.projectRoot, input.debtId);
    }
    case 'calculate-bias': {
      if (!input.debts) {
        throw new Error('debts is required for calculate-bias action');
      }
      if (!input.changedFractalPaths) {
        throw new Error(
          'changedFractalPaths is required for calculate-bias action',
        );
      }
      if (!input.currentCommitSha) {
        throw new Error(
          'currentCommitSha is required for calculate-bias action',
        );
      }
      return handleCalculateBias(
        input.debts,
        input.changedFractalPaths,
        input.currentCommitSha,
      );
    }
    default: {
      throw new Error(`Unknown action: ${(input as DebtManageInput).action}`);
    }
  }
}
