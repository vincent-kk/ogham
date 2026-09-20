/** What makes a sentence a human call, checked in this order. */
export type HumanCallKind =
  'ask-user-tool' | 'interactive-marker' | 'human-call' | 'stop';

/** A person the agent could hand a decision to; `owner` only where it means a person. */
const PERSON =
  /\b(?:the user|user's|users?|humans?|maintainers?|operators?|authors?|people|person|team lead|stakeholders?|developers?|engineers?|callers?|someone|somebody)\b|\b(?:project|repository|repo|code|package|pr) owners?\b|\bowners?(?:'s)? (?:decision|approval|consent|agreement|confirmation)\b|\bthe owner\b(?! fractal)|\bhuman (?:review|decision|judgment|judgement|confirmation)\b|\bmanual (?:confirmation|approval|review|decision)\b|\bsign-off\b/i;

/** Handing something to that person: asking, telling, reporting, waiting, or their decision or consent. */
const CALL =
  /\b(?:ask|asks|asking|tell|tells|report|reports|reported|reporting|notify|notifies|consult|escalate|escalates|escalation|inform|informs|confirm|confirms|confirmation|wait for|waits for|pause|pauses|hand|hands|decide|decides|decision|decisions|choose|chooses|choice|consent|approval|approve|approves|agreement|agree|permission|sign-off|signs? it off|raise|raises|check with|checks with|defer|defers|leave|leaves|seek|seeks|settle|settles|pick|picks|guidance)\b/i;

/**
 * A stop: an imperative `Stop`/`Abort`/`Halt` opening the sentence, or a verb
 * of stopping bound to what it ends or how (`stops the run`, `stop with`,
 * `abort with`, `and stop`, `end without`, `do not continue`). Negated uses (`never stops`)
 * are collected too and classified by hand; a lone word without end
 * punctuation (an `'abort'` event name) is a token, not a sentence.
 */
const STOP =
  /^[\s>*_\-\d.)]*(?:stop|stops|abort|aborts|halt|halts)\b|\b(?:stop|stops|abort|aborts|halt|halts)\s+(?:the run|the pipeline|the cycle|without|with|before|here|there)\b|\b(?:and|then) (?:stop|abort)\b|\bends? without\b|\bdo(?:es)? not continue\b/i;

/** A human call needs at least this many words; fewer is a label or an enum value. A stop, and a Korean call, are judged at any length. */
const MIN_WORDS = 3;

/**
 * A Korean hand-off: a person and the act of handing to them. Korean writes
 * both in one or two tokens, so word count cannot be the floor here.
 */
/** Handing off where the person is implied by the act itself. */
const IMPLIED_PERSON_CALL =
  /\b(?:wait(?:s|ing)? for (?:approval|confirmation|sign-?off)|sign-?off|human review|manual (?:confirmation|approval|review|decision))\b/i;

const KOREAN_CALL =
  /(?:사용자|사람|소유자|관리자|담당자|작성자|리뷰어|개발자|유지보수자|팀)[^.!?]{0,20}?(?:묻|물어|알리|보고|확인|동의|승인|결정|선택|요청|문의|판단|협의|합의|몫)/;

/**
 * Classify one sentence.
 * @param sentence Sentence in its normalized form (`normalizeSentence`), so emphasis markers and line breaks cannot hide a verb.
 * @returns The first kind whose rule matches, or null.
 */
export function classifyHumanCall(sentence: string): HumanCallKind | null {
  if (sentence.includes('AskUserQuestion')) return 'ask-user-tool';
  if (sentence.includes('<!-- [INTERACTIVE]')) return 'interactive-marker';
  if (KOREAN_CALL.test(sentence)) return 'human-call';
  if (
    sentence.trim().split(/\s+/).length >= MIN_WORDS &&
    ((PERSON.test(sentence) && CALL.test(sentence)) ||
      IMPLIED_PERSON_CALL.test(sentence))
  )
    return 'human-call';
  const isBareWord = /^\s*\w+\s*$/.test(sentence);
  if (STOP.test(sentence) && !isBareWord) return 'stop';
  return null;
}
