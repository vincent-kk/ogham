import { removePath } from "./utils/removePath.js";

/**
 * dot path 목록을 지운 새 문서를 반환한다.
 *
 * 설정 페이지가 project 레이어를 제출할 때 쓴다: 재정의 집합 밖의 path를
 * 제거해 "재정의된 키만" 담은 부분 문서를 만든다. 키를 빼는 것이 곧 재정의
 * 해제이므로 별도 clear 라우트가 필요 없다.
 *
 * 아무것도 지워지지 않으면 입력 참조를 그대로 돌려준다 — 이 함수는 입력을
 * 변형하지 않으므로 안전하다.
 */
export function clearConfigPaths(
  source: Record<string, unknown>,
  paths: readonly string[],
): Record<string, unknown> {
  let result = source;
  for (const path of paths) result = removePath(result, path.split("."));
  return result;
}
