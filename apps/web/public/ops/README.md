# Ops Conventions

운영 자동화와 AI 보조 자산은 이 디렉토리 아래에 둔다.

## Directory Layout

- `prompts/`
  - FAQ 생성, 규정 요약, diff 요약용 프롬프트
- `skills/`
  - 프로젝트 전용 운영 스킬
- `agents/`
  - 반복 가능한 운영 작업 정의
- `reports/`
  - QA 결과, retrieval 품질 점검, 배포 전 체크리스트

## Usage Rules

- 프롬프트는 특정 작업 단위별로 나눈다. 예: `faq-draft.md`, `regulation-diff.md`
- 사람 검토가 필요한 산출물은 `reports/`에 저장해 이력으로 남긴다.
- 자동 생성 텍스트는 원본 규정 문서 자체를 대체하지 않는다.

## Current Track A Outputs

- RAG baseline 메모: `tasks/task-a1-baseline.md`
- retrieval 품질 점검은 추후 `ops/reports/`로 이동할 수 있다.
