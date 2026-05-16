/** reason 없이 deny된 pre-tool 훅 호출에 채워 넣는 fallback 사유. */
export const GENERIC_DENY_REASON =
  'A pre-tool hook denied this call without a specific reason.';

/** deny 사유 끝에 공통으로 붙는 retry·escalation 지시. */
export const DENY_RETRY_GUIDANCE =
  'Then retry. If it fails again, STOP and ask the user — do NOT resubmit unchanged.';
