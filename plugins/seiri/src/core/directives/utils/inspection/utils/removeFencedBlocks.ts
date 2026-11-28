/** An opening or closing fence line: up to three spaces, then a run of three or more backticks or tildes. */
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Drop fenced code blocks from Markdown text.
 * @param text Markdown body.
 * @returns The text without the lines from an opening fence through the closing fence, or to the end when none closes it. A closing fence uses the same character in a run at least as long as the opening one.
 */
export function removeFencedBlocks(text: string): string {
  const kept: string[] = [];
  let open: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    const run = FENCE.exec(line)?.[1];
    if (open === undefined)
      if (run) open = run;
      else kept.push(line);
    else if (run?.[0] === open[0] && run.length >= open.length)
      open = undefined;
  }
  return kept.join('\n');
}
