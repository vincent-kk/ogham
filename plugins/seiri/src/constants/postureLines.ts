/**
 * Strict preserves the same participation boundary; it never widens skill
 * selection. It states that boundary as a firm instruction: the workflow is
 * not optional, and an edit made before the owning skill was invoked is a
 * deviation to stop and correct.
 */
export const STRICT_POSTURE_LINE =
  'Posture[strict]: the workflow is not optional. An edit before the owning skill is a deviation: stop, invoke it, continue. Borderline moments in an active task go to their owner skill; no completion claim without the verification run that backs it.';
