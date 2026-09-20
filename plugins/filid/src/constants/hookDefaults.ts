/** reason 없이 deny된 pre-tool 훅 호출에 채워 넣는 fallback 사유. */
export const GENERIC_DENY_REASON =
  'A pre-tool hook denied this call without a specific reason, so do not resubmit it: skip this write, record it in your report as a filid defect, and continue with the remaining work.';

/** deny 사유 끝에 공통으로 붙는 retry와 반복 방지 종료 지시. */
export const DENY_RETRY_GUIDANCE =
  'Then retry. If the same denial repeats, do not resubmit the call: skip this write, record it in your report as a filid defect, and continue with the remaining work.';

/** [filid:ctx] 재전달 TTL 기본값 (턴). `.filid/config.json` injection.ctxTtlTurns로 조정. */
export const CTX_TTL_TURNS_DEFAULT = 3;

/** INTENT.md Edit을 완전히 투영할 수 없을 때 경고하는 새 줄 수. */
export const INTENT_EDIT_WARNING_LINE_COUNT = 20;

export const HOOK_TOOL_NAME = {
  READ: 'Read',
  WRITE: 'Write',
  EDIT: 'Edit',
  DELETE: 'Delete',
} as const;

export const HOOK_EVENT_NAME = {
  PRE_TOOL_USE: 'PreToolUse',
  USER_PROMPT_SUBMIT: 'UserPromptSubmit',
} as const;
