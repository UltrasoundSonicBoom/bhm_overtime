# 프로젝트 로드맵 (BHM Overtime)

> Last Updated: 2026-04-09

## 현재 상태 요약

이미 구현되어 있는 것:

- 공개 웹 계산기와 규정 화면
- `data.js` 기반 정적 fallback
- `/api/data/bundle`, `/api/faq`, `/api/chat`
- Supabase Family mode 로그인/동기화
- Hono + Drizzle + Supabase/Postgres 기반 서버
- RAG 기본 구조와 FAQ 벡터 검색
- 관리자 권한용 `admin_users` 및 `requireAdmin` 미들웨어

아직 없는 것:

- 운영자가 직접 쓰는 Admin UI
- `/api/admin/*` CRUD
- 운영 콘텐츠 계층
- revision / approval / audit 흐름
- Preview 기반 게시 프로세스

## 방향 전환

이제 핵심 목표는 단순 기능 추가가 아니라, 아래 운영 플랫폼으로 전환하는 것이다.

```text
web + admin + content(md) + ai harness + preview/review/publish
```

## 우선순위

### Phase 1. 문서와 기준선 정리

- 실제 코드 기준으로 SPEC 정리
- 구현 순서와 checkpoint 문서화
- 콘텐츠/운영 디렉토리 규칙 정의

### Phase 2. Admin 데이터 기반

- 콘텐츠 운영용 테이블 추가
- approval / revision / audit 로그 추가
- Admin API 계약 정의

### Phase 3. 운영 가치 높은 데이터 이관

- 공지
- FAQ
- 규정 원문/핸드북
- 보수표/수당 일부

### Phase 4. Admin MVP

- Dashboard
- Content
- FAQ
- Regulation Versions
- Review
- Roles/Logs

### Phase 5. AI Harness + Preview

- Markdown/PDF -> 초안 생성
- 검증기 실행
- review queue
- preview 확인
- publish

## 운영 원칙

- 계산 로직은 코드에 남긴다.
- 운영 콘텐츠는 Admin/DB/MD로 분리한다.
- AI는 초안과 검수 보조를 맡고 게시 결정은 사람이 한다.
- 공개 웹은 fallback을 유지해 운영 리스크를 낮춘다.
- Preview 없는 직접 게시를 기본값으로 두지 않는다.

## 다음 액션

현재 다음 작업의 기준 문서는 아래다.

- [`SPEC.md`](/Users/momo/Documents/GitHub/bhm_overtime/SPEC.md)
- [`tasks/plan.md`](/Users/momo/Documents/GitHub/bhm_overtime/tasks/plan.md)

다음 실제 구현 시작점은:

1. Admin 운영용 테이블 설계
2. Admin API 계약 정의
3. 공지/FAQ를 먼저 관리 가능하게 이관
