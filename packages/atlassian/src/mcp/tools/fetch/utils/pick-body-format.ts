export type BodyFormat = 'adf' | 'storage' | 'wiki';

/** Decide the wire body format from the resolved service + API version. */
export function pickBodyFormat(
  service: 'jira' | 'confluence',
  apiVersion: '2' | '3',
): BodyFormat {
  // Confluence는 현재 storage API만 지원 (v3 미지원). v3 도입 시 분기 추가.
  if (service === 'confluence') return 'storage';
  return apiVersion === '3' ? 'adf' : 'wiki';
}
