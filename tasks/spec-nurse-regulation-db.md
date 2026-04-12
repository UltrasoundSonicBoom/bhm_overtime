# Spec: nurse_regulation.json -> DB Migration (Phase 12)

## Goal

`nurse_regulation.json` (간호 규정 마스터 파일)의 구조화된 데이터를 `regulation_versions` 테이블 기반으로 DB에 적재하고, source file 연결 및 re-ingest 기준을 확립한다.

## Related Tasks

- **A5**: Connect regulation source flow to version management
- **B8**: Move handbook/regulation content into reviewable source flow

## Background

현재 상태:
- `content/policies/2026/nurse_regulation.json` — 전체 간호 규정 마스터 (shift rules, wage tables, allowances, leaves, welfare, scenarios)
- `regulation-constants.js` — 프론트엔드 계산기용 상수
- `server/scripts/seed-from-data-js.ts` — data.js를 DB에 seed하는 스크립트 (이미 동작)
- `server/scripts/ingest-regulation-docs.ts` — PDF/MD를 regulation_documents로 ingest (이미 동작)
- `server/src/services/nurse-regulation.ts` — JSON에서 직접 읽어 시나리오 검증하는 서비스

## Acceptance Criteria

### AC-1: nurse_regulation.json 데이터를 regulation_versions에 연결
- regulation_version row가 source_files에 `nurse_regulation.json` 경로를 포함한다
- version의 metadata에 `_meta` 정보 (version, title, source_sha256)가 저장된다

### AC-2: JSON 구조화 데이터를 calculation_rules 테이블에 적재
- `nurse_regulation.json`의 주요 섹션이 calculation_rules로 분해되어 저장된다:
  - `working_hours_and_shift_rules` -> rule_type: 'shift_rules'
  - `wage_structure_and_allowances` -> rule_type: 'wage_structure'
  - `leaves_and_holidays` -> rule_type: 'leaves'
  - `welfare_and_training` -> rule_type: 'welfare'
  - `wage_tables_2025` -> rule_type: 'wage_table_raw'
  - `medical_support` -> rule_type: 'medical_support'
  - `leave_of_absence_and_retirement` -> rule_type: 'leave_of_absence'
- 각 rule에 source_file reference가 metadata에 포함된다

### AC-3: Re-ingest 기준 정의
- 동일 version_id + source_file 조합으로 재적재 시 기존 데이터를 삭제 후 재삽입한다 (idempotent)
- dry-run 모드에서 삽입될 row 수를 미리 확인할 수 있다
- `_meta.source_sha256`가 변경되지 않았으면 재적재를 건너뛴다 (--force로 override)

### AC-4: API에서 nurse regulation 데이터 조회 가능
- `/api/admin/regulation-rules?versionId=N` 엔드포인트로 calculation_rules 조회
- `/api/admin/regulation-rules?versionId=N&ruleType=shift_rules` 필터링

### AC-5: 기존 서비스 회귀 없음
- `server/src/services/nurse-regulation.ts`의 loadNurseRegulation은 계속 JSON 파일에서 직접 로드 (변경 없음)
- 공개 API (data/bundle, faq 등) 동작 유지

## Test Scenarios

| ID | Description | Type |
|----|-------------|------|
| T12-1 | seed 스크립트가 nurse_regulation.json을 파싱할 수 있다 | unit |
| T12-2 | dry-run 모드에서 예상 row 수를 출력한다 | unit |
| T12-3 | 적재 후 regulation_versions.source_files에 JSON 경로가 포함된다 | integration |
| T12-4 | 적재 후 calculation_rules에 7개 이상의 rule_type이 존재한다 | integration |
| T12-5 | 동일 version+source로 재적재 시 중복이 생기지 않는다 (idempotent) | integration |
| T12-6 | sha256 미변경 시 --force 없이 적재가 건너뛰어진다 | unit |
| T12-7 | /api/admin/regulation-rules 엔드포인트가 응답한다 | api |
| T12-8 | ruleType 필터로 shift_rules만 조회할 수 있다 | api |
| T12-9 | nurse-regulation.ts loadNurseRegulation은 변경 없이 동작한다 | regression |
| T12-10 | regulation-constants.js 값과 JSON 값의 정합성 확인 | parity |

## Implementation Plan

1. `server/scripts/seed-nurse-regulation.ts` — JSON -> DB seed 스크립트
2. `server/src/routes/adminOps.ts` — regulation-rules 엔드포인트 추가
3. `tests/phase12-nurse-regulation-db.js` — 테스트 파일

## Files Touched

- `server/scripts/seed-nurse-regulation.ts` (NEW)
- `server/src/routes/adminOps.ts` (MODIFY — add regulation-rules endpoint)
- `tests/phase12-nurse-regulation-db.js` (NEW)
- `tasks/spec-nurse-regulation-db.md` (NEW — this file)
