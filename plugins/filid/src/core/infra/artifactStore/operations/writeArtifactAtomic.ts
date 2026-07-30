import { writeFileAtomicallySync } from '@ogham/cross-platform';

export function writeArtifactAtomic(path: string, content: string): void {
  writeFileAtomicallySync(path, content);
}
