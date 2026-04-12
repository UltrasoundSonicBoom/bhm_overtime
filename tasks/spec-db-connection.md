# Spec: DB Connection (Priority 1 - Task B6)

## 목표

`data.js`의 `loadDataFromAPI()`가 `/api/data/bundle` 엔드포인트를 통해 Supabase DB에서 실시간 데이터를 가져오는 전체 흐름을 검증하고 안정화한다.

## 현재 상태

- `data.js`: `loadDataFromAPI()` 구현 완료. fetch('/api/data/bundle') 호출 후 DATA_STATIC과 merge.
- `server/src/routes/data.ts`: `/bundle` 엔드포인트 구현 완료. Drizzle ORM으로 6개 테이블 병렬 조회.
- `server/src/db/client.ts`: DATABASE_URL 환경변수 기반 postgres-js 연결.
- Fallback: API 실패 시 DATA_STATIC 유지, localStorage 월간 캐시 사용.

## Acceptance Criteria

### AC-1: DB 연결 및 데이터 존재 확인
- [ ] `regulation_versions` 테이블에 status='active' 행이 1개 이상 존재
- [ ] `pay_tables`, `allowances`, `calculation_rules`, `faq_entries`, `leave_types`, `ceremonies` 테이블에 active 버전 기준 데이터 존재

### AC-2: /api/data/bundle 응답 구조 검증
- [ ] 응답 JSON에 DATA_STATIC과 동일한 최상위 키 포함: jobTypes, payTables, allowances, faq, leaveQuotas, ceremonies 등
- [ ] 응답 시간 < 3초
- [ ] Content-Type: application/json

### AC-3: data.js parity check
- [ ] API 응답의 payTables 키 수 === DATA_STATIC.payTables 키 수 (일반직, 운영기능직, 환경유지지원직)
- [ ] API 응답의 faq 배열 길이 > 0
- [ ] API 응답의 jobTypes 키 수 === DATA_STATIC.jobTypes 키 수

### AC-4: Fallback 동작
- [ ] API 서버 비가용 시 DATA_STATIC으로 모든 계산기 정상 동작
- [ ] localStorage 캐시 만료 후 재시도 동작
- [ ] 비-JSON 응답 수신 시 fallback 전환

### AC-5: 기존 기능 회귀 없음
- [ ] index.html의 계산기 기능 정상 (급여 계산, 수당 계산 등)
- [ ] regulation.html 정상 렌더링
- [ ] privacy.html, terms.html 정상 렌더링

## 테스트 시나리오 (TDD)

| ID | 시나리오 | 검증 방법 |
|----|---------|----------|
| T11-1 | /api/data/bundle 응답 200 | HTTP GET |
| T11-2 | 응답 JSON 최상위 키 완전성 | 키 비교 |
| T11-3 | payTables 구조 일관성 | grades, basePay, abilityPay 존재 |
| T11-4 | faq 배열 비어있지 않음 | length > 0 |
| T11-5 | jobTypes 매핑 완전성 | 10개 직종 키 |
| T11-6 | allowances 비어있지 않음 | Object.keys > 0 |
| T11-7 | leaveQuotas.types 배열 존재 | isArray && length > 0 |
| T11-8 | ceremonies 배열 존재 | isArray && length > 0 |
| T11-9 | DATA_STATIC fallback 키 완전성 | 로컬 검증 |
| T11-10 | 응답 시간 < 3초 | 타이머 |
| T11-11 | Content-Type 헤더 검증 | response headers |

## Fallback 전략

```
Browser                    Server
  |                          |
  |-- GET /api/data/bundle -->|
  |                          |-- DB query (6 tables)
  |                          |-- 200 JSON
  |<-- merge DATA_STATIC ----|
  |                          |
  | (실패 시)                 |
  |-- DATA_STATIC fallback   |
  |-- localStorage cache     |
  |-- 월간 skip 상태 기록    |
```

## 관련 파일

- `data.js` (lines 590-662): loadDataFromAPI, DATA merge
- `server/src/routes/data.ts`: /bundle 엔드포인트
- `server/src/db/client.ts`: DB 연결
- `server/src/db/schema.ts`: 테이블 정의

## 위험 요소

1. DB에 seed 데이터가 없으면 /bundle이 404 반환 -> DATA_STATIC fallback 사용됨
2. Supabase 연결 문자열이 없는 환경에서 서버 시작 자체가 실패
3. payTables 복원 로직에서 grades 배열 중복 가능성

## 완료 기준

Phase 11 테스트 전체 PASS (0 FAIL)
