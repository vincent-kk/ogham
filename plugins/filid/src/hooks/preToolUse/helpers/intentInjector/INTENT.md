# intentInjector — 전달 모델 기반 INTENT.md 포인터 주입 + mutation 게이트

## Purpose

Read | Write | Edit | Delete 공용 방문 파이프라인. 전달 모델("규칙 문서의 경로와 읽기 지시가 live 컨텍스트에 존재하면 전달된 상태")의 3-상태(미전달/stale/fresh)에 따라 소유 fractal의 `[filid:ctx]`(cwd 기준 INTENT 경로 + 읽기 지시 + chain + detail 힌트)를 주입하고, 미전달 모듈의 mutation은 deny reason에 같은 포인터를 실어 1왕복으로 차단-전달한다 (`[filid:gate]`). `[filid:map]`은 방문 집합이 변한 경우에만 방출. 문서 본문은 어떤 출력에도 싣지 않는다 — 읽기는 에이전트의 선택이다.

## Conventions

- 상태 판정·기록의 최종 권위는 `commitVisit`(cacheManager) lock 트랜잭션; 메모리 판정은 advisory 사전 필터. 같은 턴 재방문 디렉토리는 완전 무출력 — 단 INTENT.md 대상 호출은 fast path를 우회해 전달을 기록
- fresh(경과 < `injection.ctxTtlTurns`, 기본 3턴) → 무출력; stale → soft ctx 재전달; 미전달 → Read는 ctx, mutation은 deny(+읽기 지시) 후 재시도 통과
- mutation은 Write/Edit/Delete이며 Delete 방문도 `commitVisit`을 거쳐 owner delivery 상태를 갱신
- 게이트 면제: INTENT/DETAIL 대상(문서 위생과 삭제 보호는 validator 전담), owner INTENT 부재. INTENT.md를 대상으로 한 모든 도구 호출(Read 포함)은 조용한 전달 — delivery stamp, ctx·guide 없음, map은 방문 집합이 바뀌면 방출
- 전달 단위는 소유 fractal(chain 상향 첫 INTENT.md 보유 dir); 키는 `{boundary}\t{relDir}`; 서브 스코프 분리는 판별 transcript_path 제공 시 자동 활성 (현행 미제공 → 세션 공유, DETAIL 참조)
- hook guide block은 스코프당 1회, 첫 ctx(또는 첫 deny reason)에 선행
- `[filid:ctx]`의 경로는 hook cwd 기준 상대경로(cwd 밖이면 절대경로)이며 `intent:`·`action:`·`chain:`·`detail:` 줄로만 구성된다 — 경로와 읽기 지시이지 본문이 아니다

## Boundaries

### Always do

- boundary는 즉시 캐시해 chain 재계산 회피; machine path는 portable API로 정규화
- deny reason에는 항상 재시도 안내와 owner INTENT.md 경로·읽기 지시를 포함 (bare deny 금지)
- Read/Write/Edit/Delete 모두 동일한 방문 기록과 delivery 상태 전이를 사용

### Ask first

- `[filid:ctx]`/`[filid:map]`/`[filid:gate]` 포맷 변경 (에이전트가 읽는 계약)
- TTL 기본값(3턴) 변경, INTENT/DETAIL 외 게이트 면제 목록 확장
- mutation 방문 집합 또는 Delete의 전달 상태 갱신 의미 변경

### Never do

- INTENT.md 본문을 ctx나 deny reason에 inline (hook은 문서를 읽지 않는다)
- 읽었다는 증명을 에이전트에게 주장 (전달 stamp는 deny 시점에 찍히고 재시도는 통과한다)
- stale/fresh 상태에서 deny 발화 (deny는 미전달 mutation 전용)
- 프로젝트 파일 write (캐시 파일 외 부수효과 금지)
- 전달 기록을 세션 epoch 간 공유 (compact/clear 리셋 필수)
- branch 이름이나 spike 상태를 gate 입력으로 사용
