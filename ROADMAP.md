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

## 2트랙 우선순위

### Track A. RAG 완성 먼저

먼저 끝내야 하는 항목:

- `regulation_documents`를 실제 PDF/MD 원문에서 청킹해서 넣는 ingest 파이프라인
- 규정 원문 임베딩 생성
- 챗봇 답변 품질 검증
- FAQ direct match와 regulation document 검색의 실제 데이터 충만도 확인

이 트랙이 먼저인 이유:

- 챗봇과 규정 검색은 이미 사용자에게 노출된 기능이다.
- 스키마와 API는 있는데 실제 ingest/품질 검증이 비어 있으면 "구조만 있고 내용이 빈" 상태가 된다.
- Admin은 이 결과물을 운영하기 위한 후속층이므로, 데이터 파이프라인이 먼저 안정돼야 한다.

### Track B. Admin 운영 흐름

Track A와 병행 또는 후속으로 진행:

- FAQ
- Regulation Versions
- review / publish
- audit / revision
- content 관리

## 단계별 진행

### Step 0. 기준선 정리

- 실제 코드 기준으로 SPEC 정리
- 구현 순서와 checkpoint 문서화
- 현재 DB 연결 상태와 RAG 데이터 상태 확인

### Step 1. Track A 시작

- ingest 파이프라인 작성
- regulation 임베딩 생성
- retrieval 품질 검증

### Step 2. Track B 기반 구축

- 콘텐츠 운영용 테이블 추가
- approval / revision / audit 로그 추가
- Admin API 계약 정의

### Step 3. 운영 우선순위 이관

- FAQ
- 규정 버전
- 공지
- 핸드북/규정 원문
- 보수표/수당 일부

### Step 4. Admin MVP + Preview

- Dashboard
- FAQ
- Regulation Versions
- Review
- Roles/Logs
- preview / publish

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

1. RAG 기준선 확인
2. regulation ingest 파이프라인 작성
3. regulation embedding 생성
4. FAQ/RAG 검색 품질 검증
5. 그 다음 Admin 운영용 테이블과 규정/FAQ 관리 흐름 추가
