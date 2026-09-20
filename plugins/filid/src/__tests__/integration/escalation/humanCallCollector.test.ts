import { describe, expect, it } from 'vitest';

import { classifyHumanCall } from './helpers/utils/classifyHumanCall.js';
import { normalizeSentence } from './helpers/utils/normalizeSentence.js';
import { sourceLiteralSentences } from './helpers/utils/sourceLiteralSentences.js';

describe('the human-call collector reads literals and classifies sentences by explainable rules', () => {
  it('takes sentences from string and template literals only, never from comments or identifiers', () => {
    const texts = sourceLiteralSentences(
      [
        '// Ask the user in a comment.',
        'const askTheUser = 1; /* tell the user */',
        "const a = 'Ask the user which base to use.';",
        'const b = `Tell the user that ${path} exists. Then retry.`;',
      ].join('\n'),
    ).map(({ text, line }) => [line, normalizeSentence(text)]);
    expect(texts).toEqual([
      [3, 'Ask the user which base to use.'],
      [4, 'Tell the user that ${} exists.'],
      [4, 'Then retry.'],
    ]);
  });

  it.each([
    ['Ask the user whether to start a fresh review.', 'human-call'],
    ["With the user's consent, rewrite the quote.", 'human-call'],
    ['Record for a repository owner decision later.', 'human-call'],
    ['Resolve the owner fractal of the file.', null],
    ['Stop without dispatching actors.', 'stop'],
    ['Stop.', 'stop'],
    ['Check with the owner before continuing.', 'human-call'],
    ['This needs human review.', 'human-call'],
    ['It requires manual confirmation first.', 'human-call'],
    ['Escalate to the maintainer of that package.', 'human-call'],
    ['Wait for approval before publishing.', 'human-call'],
    ['Request confirmation from the operator.', 'human-call'],
    ['Pause until a person resolves it.', 'human-call'],
    ['Raise this with the PR author.', 'human-call'],
    ['Record the sign-off in the report.', 'human-call'],
    ['사용자에게 확인한다.', 'human-call'],
    ['담당자 승인을 받는다.', 'human-call'],
    ['Leave the final call to the repository maintainer.', 'human-call'],
    ['Defer to the engineer who owns it.', 'human-call'],
    ['Hand the decision back to the caller.', 'human-call'],
    ['Seek guidance from the person running the session.', 'human-call'],
    ['Only a human can settle this.', 'human-call'],
    ['This is where we let the developer pick.', 'human-call'],
    ['Block the merge until someone signs it off.', 'human-call'],
    ['사람의 판단이 필요하다.', 'human-call'],
    ['개발자에게 물어본 뒤 진행한다.', 'human-call'],
    ['작성자와 협의가 필요하다.', 'human-call'],
    ['팀에서 합의가 필요하다.', 'human-call'],
    ['유지보수자의 몫이다.', 'human-call'],
    ['`--auto` → **abort** with `Typecheck failed.`', 'stop'],
    ['abort', null],
    ['Interactive only: use AskUserQuestion once.', 'ask-user-tool'],
    ['<!-- [INTERACTIVE] --> confirm', 'interactive-marker'],
    ['Read the file and call prepare again.', null],
  ] as const)('classifies %j as %s', (sentence, kind) => {
    expect(classifyHumanCall(normalizeSentence(sentence))).toBe(kind);
  });

  it('normalizes whitespace, interpolations and emphasis, keeping wording and case', () => {
    expect(normalizeSentence('  Ask the\n   user about ${a.b}  now. ')).toBe(
      'Ask the user about ${} now.',
    );
    expect(normalizeSentence('**Abort** with _this_ and `**keep**`.')).toBe(
      'Abort with this and `**keep**`.',
    );
  });
});
