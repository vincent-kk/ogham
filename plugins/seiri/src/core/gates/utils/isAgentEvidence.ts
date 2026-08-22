/** Agent provenance marker required at the end of current evidence. */
const AGENT_EVIDENCE = /\(via agent \S+\)$/;

/**
 * Identify met evidence that still carries delegated provenance.
 *
 * @param evidence Complete evidence value.
 * @returns Whether an agent marker is the final suffix.
 */
export function isAgentEvidence(evidence: string): boolean {
  return AGENT_EVIDENCE.test(evidence);
}
