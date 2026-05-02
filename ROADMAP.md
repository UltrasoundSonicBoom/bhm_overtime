# 프로젝트 로드맵 (BHM Overtime / SNUH Mate Team Plan)

> Last Updated: 2026-05-02

## 현재 상태 요약

이 저장소의 현재 기준은 정적 단일 앱이 아니라, Team Plan을 향해 정리 중인 모노레포 구조다.

이미 구현되어 있거나 현재 체크아웃에서 기준으로 삼아야 하는 것:

- Astro web app under `apps/web`
- workspace packages under `packages/*`
- Firebase Auth + Firestore optional sync
- local FastAPI parser backend under `backend/`
- schedule parser, sync, and review queue tests

중요한 경계:

- 브라우저 앱은 `apps/web`의 Astro/ESM 흐름을 기준으로 한다.
- 개인 데이터 동기화는 Firebase Auth + Firestore를 선택적 sync 계층으로 본다.
- 근무표/급여명세서 파싱처럼 로컬 처리에 가까운 기능은 `backend/`의 FastAPI 백엔드가 맡는다.
- Team Plan의 핵심 도메인 로직은 화면에 묶지 않고 `packages/*` 워크스페이스 패키지로 분리한다.
- 로그인 계정과 병원/부서의 업무상 직원 정체성은 분리해서 설계한다.

## 제품 방향

가장 가까운 목표는 병원 전체 ERP가 아니라, 실제로 팔 수 있는 부서 단위 Team Plan이다.

1차 제품은 두 데모 팀을 기준으로 좁힌다.

- 3교대 간호부서: 간호사 중심의 월간 근무표, 교대 규칙, 변경/승인 흐름
- Angio 팀: 의사, 간호사, 방사선사 중심의 평일/주말 온콜, 시간외, 팀 운영 흐름

Team Plan이 해결해야 하는 핵심 문제:

- 근무표 import 후 규칙 위반을 사람이 검토 가능한 형태로 보여준다.
- 운영자 수정은 원본을 덮어쓰지 않고 overlay/change log로 남긴다.
- 배포 가능한 근무표 버전과 승인/감사 흐름을 분리한다.
- 개인용 급여/명세서 데이터와 팀 공유 근무/온콜 데이터의 노출 범위를 분리한다.
- AI는 초안, 검토 보조, 이상 징후 설명을 맡고 최종 게시 결정은 사람이 한다.

## 근시일 실행 큐

사용자가 선택한 실행 순서: `1,3,4,5,2`

1. Task 1: ROADMAP 최신화
2. Task 3: `packages/scheduling` rule/evaluate/import-normalize 최소 엔진
3. Task 4: Firebase real sync E2E/readiness 검증
4. Task 5: Firestore plaintext profile/schedule migration plan
5. Task 2: Team Plan product surface skeleton

이 순서는 "먼저 지금 방향을 고정하고, 규칙/워크플로우 엔진의 최소 계약을 만든 뒤, 동기화/데이터 안전성을 확인하고, 마지막에 사용자가 볼 Team Plan 표면을 연다"는 기준이다.

## 단계별 목표

### 1. 방향과 기준선 고정

- 현재 런타임 구조를 문서와 코드 기준으로 맞춘다.
- 오래된 운영 우선순위와 현재 Team Plan 우선순위를 분리한다.
- 기존 개인 도구와 새 Team Plan 표면이 섞이지 않도록 route/package 경계를 둔다.

### 2. Firebase sync readiness 검증

- 실제 credential 없이도 브라우저에서 Firebase sync 준비 상태를 확인할 수 있는 E2E 검증을 둔다.
- 로그인 전/후 상태, localStorage source of truth, Firestore write-through mirror 경계를 확인한다.
- 통과한 테스트가 "실제 Firestore 운영 데이터 검증"을 의미하는지, readiness 검증인지를 명확히 표시한다.

### 3. Firestore plaintext migration plan

- 기존 profile/schedule 데이터 중 평문으로 남아 있는 항목을 식별한다.
- 암호화/마이그레이션/롤백/검증 순서를 문서화한다.
- 사용자별 uid 경계, 삭제 흐름, 재동기화 흐름을 함께 점검한다.

### 4. Team Plan surface skeleton

- 새 Team Plan 표면은 `/team/schedules` 계열 route로 연다.
- 기존 `nurse_admin` 또는 `schedule_suite`를 억지로 확장하지 않는다.
- 관리자, import, rule review, approval, audit, 내 근무표, swap 같은 운영 화면의 뼈대를 만든다.

### 5. Scheduling domain package

- `packages/scheduling`에 import-normalize, rule evaluation, overlay, availability 계산을 분리한다.
- 원본 import snapshot은 immutable하게 유지한다.
- 운영자 수정은 overlay로 적용하고, publish 가능한 버전과 감사 로그를 후속 단계에서 연결한다.
- 1차 규칙은 간호부서 MVP 기준으로 작게 시작하고 Angio 규칙은 별도 rule pack으로 확장한다.

## 운영 원칙

- Team Plan은 부서 단위 유료 제품을 기준으로 설계한다.
- 데이터 모델은 login identity와 employee identity를 섞지 않는다.
- 로컬 파싱, 브라우저 상태, Firebase sync, Team Plan 공유 데이터의 책임을 분리한다.
- 개인정보와 팀 운영 정보는 보이는 범위부터 다르게 설계한다.
- 테스트는 "동작함"과 "실제 운영 데이터에 연결됨"을 구분해서 기록한다.
- 오래된 표면은 보존하되, 새 Team Plan 개발은 새 route/package 경계 안에서 진행한다.
