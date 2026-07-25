import {
  readSection,
  sectionMarkers,
} from "@ogham/cross-platform/instructions";

export function findOwnedRuleSections(
  source: string,
  owner: string,
): readonly string[] {
  const namespace = owner.toUpperCase();
  const prefix = `<!-- ${namespace}:START:`;
  const filenames = new Set<string>();
  let cursor = 0;

  while (cursor < source.length) {
    const start = source.indexOf(prefix, cursor);
    if (start === -1) break;
    const filenameStart = start + prefix.length;
    const filenameEnd = source.indexOf(" -->", filenameStart);
    if (filenameEnd === -1) break;
    const filename = source.slice(filenameStart, filenameEnd);
    const markers = sectionMarkers(namespace, filename);
    if (readSection(source.slice(start), markers) !== null)
      filenames.add(filename);

    cursor = filenameEnd + 4;
  }

  return [...filenames];
}
