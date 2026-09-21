/**
 * A template literal body with each top-level `${…}` replaced by `${}`.
 *
 * Braces are counted to find the end of an expression. A brace inside a
 * string or a nested template within the expression can end it early; the
 * static text of a template nested inside an expression is not kept.
 * @param body Template body as the lexer returned it.
 * @returns The static text with interpolation marks.
 */
export function staticTemplateText(body: string): string {
  let text = '';
  for (let index = 0; index < body.length; index += 1) {
    if (body[index] !== '$' || body[index + 1] !== '{') {
      text += body[index];
      continue;
    }
    let depth = 0;
    for (index += 1; index < body.length; index += 1)
      if (body[index] === '{') depth += 1;
      else if (body[index] === '}' && (depth -= 1) === 0) break;

    text += '${}';
  }
  return text;
}
