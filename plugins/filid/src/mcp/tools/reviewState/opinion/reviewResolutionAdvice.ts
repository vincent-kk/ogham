/** Evidence or a human choice proposed to resolve one inconclusive review point. */
export interface ReviewResolutionAdvice {
  /** One bounded question whose answer would enable a conclusive check. */
  question: string;
  /** Concrete missing evidence, or an explicit statement that it is unidentified. */
  evidenceNeeded: string[];
  /** Suggested next step; never an executable instruction or permission grant. */
  nextAction: string;
  /** Observable condition that must be verified before reconsidering the verdict. */
  doneWhen: string;
  /** Proposed attention route, not an assignment or an assertion of authority. */
  suggestedOwner: 'agent' | 'human' | 'unknown';
  /** Why evidence gathering alone cannot settle a proposed human decision. */
  humanReason?: string;
}
