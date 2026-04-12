# Content Conventions

운영 원본 콘텐츠는 이 디렉토리 아래에 둔다.

## Goals

- 공개 웹의 fallback과 별개로 운영 가능한 원본 문서를 한 곳에 모은다.
- 규정 원문, FAQ seed, 공지, 랜딩 카피를 서로 다른 수명주기로 관리한다.
- 향후 Admin과 approval workflow가 붙더라도 원본 기준이 흔들리지 않게 한다.

## Directory Layout

- `policies/`
  - 규정 원문 PDF/MD와 버전별 보조 문서
- `faq-seeds/`
  - FAQ 초안, 변환 후보, 검수 전 seed 데이터
- `notices/`
  - 공지/업데이트용 원본 Markdown
- `landing/`
  - 홈 화면 카피, 도움말, 배너 텍스트

## Naming Rules

- 규정 원문: `policies/{year}/{source-name}.{pdf|md}`
- FAQ seed: `faq-seeds/{year}/{topic}.md`
- 공지: `notices/{yyyy-mm-dd}-{slug}.md`
- 랜딩 카피: `landing/{surface}-{locale}.md`

## Source of Truth Rules

- 실제 법적/운영 근거가 되는 원문은 `policies/`에 보관한다.
- 외부에서 받은 파일은 먼저 원본명을 유지해 보관하고, 필요하면 같은 폴더에 정리본 MD를 추가한다.
- DB에 적재된 chunk의 `source_file`은 가능하면 이 디렉토리 기준 상대경로와 대응되도록 유지한다.

## Current Track A Note

- 2026 원문 PDF는 이제 `content/policies/2026/2026_조합원_수첩_최종파일.pdf`로 repo 안에 편입했다.
- 운영용 정리본은 `content/policies/2026/nurse_regulation.md`와 `content/policies/2026/nurse_regulation.json`을 기준으로 삼는다.
