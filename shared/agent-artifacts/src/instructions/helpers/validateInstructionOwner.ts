const OWNER_PATTERN = /^[a-z][a-z0-9-]*$/;

export function validateInstructionOwner(owner: string): void {
  if (!OWNER_PATTERN.test(owner))
    throw new Error(
      `Instruction owner must use lowercase kebab case; received "${owner}"`,
    );
}
