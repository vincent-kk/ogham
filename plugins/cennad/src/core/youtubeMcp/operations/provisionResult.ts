// Cennad's stable summary of provisioning one target CLI. Both the Antigravity
// file adapter and the Codex agent-artifacts adapter map their detailed outcomes
// to this intentionally small contract.
export type ProvisionAction = 'added' | 'removed' | 'unchanged';

export interface ProvisionResult {
  ok: boolean;
  action: ProvisionAction;
}
