# SNUHmate Harness

SNUHmate 전용 Claude Code 에이전트 하네스. SNUH 병원 직원의 초과근무·급여·퇴직금 계산 앱 개발 워크플로우를 자동화하는 6개의 `smate-*` 스킬을 묶은 Claude Code 플러그인입니다.

## 설치

```bash
/plugin install github:UltrasoundSonicBoom/bhm_overtime?path=packages/snuhmate-harness
```

## 포함 스킬

| 스킬 | 트리거 표현 | 목적 |
|------|------------|------|
| `smate-feature-ship` | "새 기능 만들어줘 끝까지", "이 기능 출시까지", "한 사이클 돌려줘" | spec → 구현 → QA → PR → 머지 전체 사이클 메타 워크플로우 |
| `smate-payroll-review` | "계산기 바꿨어", "단협 데이터 수정했어", "호봉표 drift 확인" | 급여·퇴직금·단협·파서 변경의 회귀 영향 검증 |
| `smate-design-guard` | "UI 바꿨어", "CSS 손봤어", "디자인시스템 점검", "토큰 외 색 있는지" | UI/CSS/Astro 변경 후 디자인시스템 룰 위반 자동 점검 |
| `smate-b6-masking` | "B6 마스킹 작업", "마스킹 서비스 만들어줘", "마스킹 파이프라인 검토" | CSV·Excel·PDF·이미지 한국 PII 마스킹 서비스 구현 워크플로우 |
| `smate-pr-ops` | "커밋푸쉬머지", "ship it", "PR 만들어 머지까지" | 리뷰 → CHANGELOG → commit → push → PR → 머지 자동화 |
| `smate-pii-patterns` | (B6 마스킹 구현 시 내부 참조) | 한국 PII 정규식·NER 룰·마스킹 토큰 명세 도메인 지식 문서 |

## 빠른 시작

새 기능을 처음부터 끝까지 한 번에 진행하려면:

```
/smate-feature-ship
```

Claude가 B 카탈로그 슬롯·페르소나 확인 → spec 작성 → plan → 구현 → 검증 → PR 순서로 안내합니다.

예시 대화:

```
사용자: B6 마스킹 기능 끝까지 만들어줘

Claude: /smate-feature-ship 실행
→ Step 1: persona-matrix.md B6 행 확인
→ Step 2: 브레인스토밍 + spec 작성
→ Step 3: plan 작성
→ Step 4: /smate-b6-masking 진입
→ ...
→ Step 7: /smate-pr-ops 로 머지
```

작은 변경·급여 로직 수정만이라면:

```
/smate-payroll-review
```

UI만 바꿨다면:

```
/smate-design-guard
```

커밋·PR·머지만 처리하려면:

```
/smate-pr-ops
```

## 구조

```
packages/snuhmate-harness/
├── .claude-plugin/
│   ├── plugin.json        — 플러그인 메타데이터
│   └── marketplace.json   — 마켓플레이스 등록 정보
├── skills/
│   ├── smate-feature-ship/SKILL.md
│   ├── smate-payroll-review/SKILL.md
│   ├── smate-design-guard/SKILL.md
│   ├── smate-b6-masking/SKILL.md
│   ├── smate-pr-ops/SKILL.md
│   └── smate-pii-patterns/SKILL.md
└── README.md
```

## 관련 링크

- SNUHmate 프로젝트: [github.com/UltrasoundSonicBoom/bhm_overtime](https://github.com/UltrasoundSonicBoom/bhm_overtime)
- 하네스 문서: `docs/harness/` (b-catalog.md, persona-matrix.md)
- 에이전트 정의: `.claude/agents/` (smate-payroll-domain, smate-test-impact, smate-pii-masker, smate-ds-guard, smate-pr-reviewer, smate-ship-it)
