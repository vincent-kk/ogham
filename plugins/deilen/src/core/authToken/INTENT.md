## Purpose

로컬 HTTP 서버용 일회용 인증 토큰 발급·검증 모듈. timing-safe 비교로 timing attack 을 방지한다.

## Structure

| File               | Role                                                          |
| ------------------ | ------------------------------------------------------------- |
| `generateToken.ts` | `randomBytes(16).toString('hex')` — 32자 hex 토큰 반환        |
| `verifyToken.ts`   | `timingSafeEqual` 로 `expected` vs `provided` UTF-8 버퍼 비교 |
| `index.ts`         | barrel — `generateToken`, `verifyToken` re-export             |

## Conventions

- 토큰 형식은 32자 hex (`randomBytes(16)`)
- 비교는 항상 `timingSafeEqual`; 길이 불일치 시 즉시 `false` 반환
- 호출자가 토큰을 메모리에 보관 — 디스크 영속화 안 함

## Boundaries

### Always do

- `timingSafeEqual` 만 사용해 토큰 비교
- 길이 불일치는 비교 전 `false` 반환

### Ask first

- 토큰 길이·인코딩 변경

### Never do

- 평문 `===` 비교
- 토큰을 디스크·로그에 저장

## Dependencies

- `node:crypto` (`randomBytes`, `timingSafeEqual`)
- `node:buffer` (`Buffer`)
