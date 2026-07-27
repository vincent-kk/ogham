import { writeFileAtomicallySync } from '@ogham/cross-platform/filesystem';

export function writeArtifactAtomic(path: string, content: string): void {
  writeFileAtomicallySync(path, content);
}
