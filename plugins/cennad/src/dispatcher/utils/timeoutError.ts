export interface TimeoutErrorInput {
  cli: string;
  timeoutKind: 'wall' | 'idle' | undefined;
  idleTimeoutMs: number | undefined;
  hardCapMs: number | undefined;
}

// An idle stop and a ceiling stop mean different things to the caller: the first says
// the CLI went quiet (crashed, hung, waiting on something it will never get), the
// second says it was still working when the tier's budget ran out. Both surface as
// ETIMEDOUT for errorMap; only the message differs.
export function timeoutError(input: TimeoutErrorInput): NodeJS.ErrnoException {
  const message =
    input.timeoutKind === 'idle'
      ? `${input.cli} produced no output for ${input.idleTimeoutMs}ms — treated as stalled`
      : `${input.cli} reached this tier's ${input.hardCapMs}ms ceiling while still running`;
  const err = new Error(message) as NodeJS.ErrnoException;
  err.code = 'ETIMEDOUT';
  return err;
}
