/**
 * 읽기 폴백과 덮어쓰기 전 백업이 같은 일자 로그 판정을 사용하게 한다.
 * @param value JSON에서 읽은 값. 세션 레코드의 상세 스키마까지 검사하지 않는다.
 * @returns 객체에 truthy sessions가 있으면 기존 읽기 경로가 수용하는 형태다.
 */
export function isSessionDayLogShape(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'sessions' in value &&
      value.sessions,
  );
}
