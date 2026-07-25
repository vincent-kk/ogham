export function requireArtifactOwner(owner: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(owner))
    throw new Error(
      `Artifact owner must use lowercase kebab case; received "${owner}"`,
    );

  return owner;
}
