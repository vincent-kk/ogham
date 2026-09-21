/** A sentence with the 1-based line it starts on and the whole line around it. */
export interface LocatedSentence {
  line: number;
  text: string;
  /** The full line the sentence came from; names a sentence too short to stand alone. */
  context: string;
}

/**
 * Split text into sentences: at a line break, at a Markdown table cell border
 * (` | `), or after `.`, `!` or `?` followed by whitespace and a capital
 * letter, a quote, a backtick, a bracket or emphasis. Abbreviations such as
 * `e.g.` stay inside their sentence.
 * @param text Text of one literal or one document.
 * @param firstLine Line the text starts on.
 * @returns Non-blank sentences in order.
 */
export function splitSentences(
  text: string,
  firstLine: number,
): LocatedSentence[] {
  return text.split('\n').flatMap((lineText, offset) =>
    lineText
      .split(/\s\|\s|(?<=[.!?])\s+(?=[A-Z`"'([*])/)
      .filter((sentence) => sentence.trim() !== '')
      .map((sentence) => ({
        line: firstLine + offset,
        text: sentence,
        context: lineText,
      })),
  );
}
