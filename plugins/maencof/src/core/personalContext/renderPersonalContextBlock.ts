/**
 * @file renderPersonalContextBlock.ts
 * @description SessionStart 1회용 `<personal-context>` 블록 렌더.
 *
 * 캡처 지침을 블록에 내장한다 — enabled일 때만 지침이 존재해 읽기·쓰기
 * 지침이 응집되고, 항목이 없어도 지침은 주입되어 캡처를 부트스트랩한다.
 * 만료 항목은 여기서 lazy-filter로 주입에서만 제외한다 (파일 불변 —
 * 실제 제거는 SessionEnd prunePersonalContext 소관). 런타임 컷은 없다 —
 * 예산은 저작 게이트(MCP 입력 길이 상한 + 항목 캡)가 통제한다.
 */
import {
  MAX_INJECTED_TOPICS,
  SUGGESTED_STATE_KINDS,
  SUGGESTED_TOPIC_KINDS,
  PERSONAL_CONTEXT_TAG,
} from '../../constants/personalContext.js';
import type {
  PersonalContextFile,
  PersonalState,
  PersonalStateIntensity,
  PersonalTopic,
} from '../../types/personalContext.js';

const INTENSITY_RANK: Record<PersonalStateIntensity, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

/**
 * personal-context 블록을 만든다. `config.enabled=false`면 빈 문자열을 반환한다.
 */
export function renderPersonalContextBlock(
  model: PersonalContextFile,
  now: Date = new Date(),
): string {
  if (!model.config.enabled) return '';

  const states = selectActiveStates(model.states, now);
  const topics = selectInjectedTopics(model.topics);

  const lines: string[] = [`<${PERSONAL_CONTEXT_TAG}>`, ...buildDirectiveLines()];
  if (states.length > 0) {
    lines.push('  states:');
    for (const state of states) lines.push(renderStateLine(state));
  }
  if (topics.length > 0) {
    lines.push('  topics:');
    for (const topic of topics) lines.push(renderTopicLine(topic));
  }
  lines.push(`</${PERSONAL_CONTEXT_TAG}>`);
  return lines.join('\n');
}

/** 만료 판정 불가(파싱 실패) 항목은 보수적으로 유지한다. */
function selectActiveStates(states: PersonalState[], now: Date): PersonalState[] {
  const nowMs = now.getTime();
  return states
    .filter((state) => {
      const expiresMs = Date.parse(state.expiresAt);
      return Number.isNaN(expiresMs) || expiresMs > nowMs;
    })
    .sort(
      (a, b) =>
        INTENSITY_RANK[b.intensity] - INTENSITY_RANK[a.intensity] ||
        b.lastReinforcedAt.localeCompare(a.lastReinforcedAt),
    );
}

function selectInjectedTopics(topics: PersonalTopic[]): PersonalTopic[] {
  return topics
    .filter((topic) => topic.status === 'active')
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .slice(0, MAX_INJECTED_TOPICS);
}

function buildDirectiveLines(): string[] {
  const stateKinds = SUGGESTED_STATE_KINDS.slice(0, 5).join(', ');
  const topicKinds = SUGGESTED_TOPIC_KINDS.slice(0, 5).join(', ');
  return [
    '  Apply silently: weave this awareness into tone, pacing, and suggestions.',
    "  Never state that you track the user's state or topics; never fixate on them.",
    "  Capture: when the conversation clearly evidences a durable shift in the user's",
    `  condition (e.g. ${stateKinds}) or a recurring personal`,
    `  topic worth remembering (e.g. ${topicKinds}), record it`,
    '  quietly via the capture_personal_context MCP tool — typically 1-2 per session, more',
    '  when several clearly surface. Resolve entries the user reports as over.',
  ];
}

function shortDate(isoLike: string): string {
  return isoLike.slice(5, 10);
}

function renderStateLine(state: PersonalState): string {
  const note = state.note ? ` — ${state.note}` : '';
  return `  - ${state.label} (${state.kind}, ${state.intensity}, ~${shortDate(state.expiresAt)})${note}`;
}

function renderTopicLine(topic: PersonalTopic): string {
  const note = topic.note ? ` — ${topic.note}` : '';
  const due = topic.due ? `due ${shortDate(topic.due)}, ` : '';
  return `  - [${topic.kind}] ${topic.label}${note} (${due}${shortDate(topic.lastSeenAt)}, x${topic.touchCount})`;
}
