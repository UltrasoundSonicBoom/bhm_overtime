---
name: gpters-setup
description: |
  GPTers 스터디 첫 시작 환경을 세팅합니다. CLAUDE.md, .gitignore, memory를 생성하고 사용 가능한 스킬을 안내합니다. 처음 Claude Code를 시작하거나, 스터디에 처음 참여하거나, '세팅', '온보딩', '처음 시작' 같은 말을 하면 이 스킬을 사용하세요.
---

# GPTers Setup

스터디 스타터킷 온보딩. 환경 파일을 세팅하고, 프로젝트를 파악하고, 스킬을 안내합니다.

## Quick Start

```text
/gpters-setup              # 기본 실행
```

## Phase 1: 환영 + 개인 정보

```
안녕하세요! GPTers Claude Code 스터디에 오신 걸 환영합니다 👋
먼저 환경을 세팅할게요.
```

AskUserQuestion (2개):
1. "이름(닉네임)이 뭔가요?"
   - 자유 입력
2. "이번 스터디에서 어떤 걸 해보고 싶으세요?"
   - 반복 업무 자동화 스킬 만들기
   - 코딩/개발 실력 올리기
   - 사례글 많이 써서 공유하기
   - 아직 잘 모르겠어요 (괜찮아요!)

## Phase 2: 프로젝트 파악

AskUserQuestion:
- "어떤 프로젝트에서 Claude Code를 사용할 건가요?"
  - 웹/앱 개발
  - 데이터 분석/자동화
  - 문서/콘텐츠 작업
  - 아직 정하지 못함 → Phase 2.5로

## Phase 2.5: 사례 탐색 (미정 시)

`gpters-docs/cases/` 에서 Explore 에이전트 3개를 병렬 실행:
- Agent 1: 업무 자동화 사례 탐색
- Agent 2: 코딩/개발 사례 탐색
- Agent 3: 문서/콘텐츠 사례 탐색

결과에서 가장 적합한 3가지를 추천:

```
다른 분들의 사례를 찾아봤어요. 이런 건 어때요?

  1. {사례 제목} — {한 줄 요약}
  2. {사례 제목} — {한 줄 요약}
  3. {사례 제목} — {한 줄 요약}

이 중에 끌리는 게 있나요? 아니면 다른 아이디어가 있으세요?
```

## Phase 3: 환경 파일 세팅

Phase 1-2 답변을 기반으로 다음 파일들을 생성/업데이트:

### 3-1. CLAUDE.md 업데이트

```markdown
# My Project

## 프로젝트 소개
- **이름**: {사용자 입력}
- **한 줄 설명**: {Phase 2 답변 기반}
- **기술 스택**: {해당 시 입력}

## 작업 규칙
- 한국어로 대화합니다
- 코드 수정 전에 plan mode로 계획을 먼저 세웁니다

## 현재 목표
- [ ] {사용자 목표}
```

### 3-3. .gitignore 업데이트

기존 .gitignore에 아래 항목 추가 (없으면 생성):
```
.env
.env.local
secret.md
```

### 3-4. secret.md 생성

```markdown
# Secret (git 추적 제외)
<!-- API 키, 비밀번호 등 민감 정보를 여기에 보관 -->
```

### 3-5. user/project memory 자동 업데이트 활성화

`~/.claude/` 하위 user memory와 project memory에 스터디 정보를 기록:

**user memory** (`~/.claude/CLAUDE.md` 또는 user settings):
```markdown
## GPTers 스터디 정보
- **이름**: {닉네임}
- **목표**: {스터디 목표}
- **기수**: 21기
```

**project memory** (`.claude/settings.local.json` 또는 프로젝트 CLAUDE.md):
```markdown
## 프로젝트 정보
- **유형**: {선택한 프로젝트 유형}
- **스터디 시작일**: {오늘 날짜}
- **현재 주차**: 1주차
```

> Claude Code의 auto-memory 기능이 활성화되어 있으면, 스킬 사용 시 학습 기록이 자동으로 memory에 축적됩니다.

## Phase 4: 스킬 안내

```
세팅 완료! 이제 다음 스킬들을 사용할 수 있어요:

  /gpters-thinking-partner  뭘 만들지 정리하고 싶을 때
  /gpters-research-case    다른 사람들 사례 구경할 때
  /gpters-writer           작업 후 사례글 쓸 때 (매주 과제)
  /deep-research           Claude Code 팁이 필요할 때
  /skill-creator           나만의 스킬을 만들고 싶을 때
  /gpters-skill-updater    만든 스킬 수정/개선할 때

1주차 과제:
  1. /gpters-thinking-partner 으로 프로젝트 정의서 만들기
  2. plan mode(shift+tab)로 첫 구현 시도
  3. /gpters-writer 로 사례글 작성 → GPTers 게시
```

## Phase 5: 다음 액션

AskUserQuestion:
- "바로 시작해볼까요?"
  - /gpters-thinking-partner 로 프로젝트 정의서 만들기 → 해당 스킬 실행
  - /gpters-research-case 로 사례 먼저 구경하기 → 해당 스킬 실행
  - 나중에 할게요 → 종료

## Rules

- 스터디원 대부분이 비개발자이므로 기술 용어 대신 일상어를 쓰면 이탈률이 낮아집니다
- 사용자가 이미 작성한 내용이 있을 수 있으므로 기존 파일을 먼저 읽고 병합합니다
- .env, secret.md가 노출되면 보안 사고로 이어지므로 .gitignore 포함 여부를 확인합니다
- 병렬 에이전트가 너무 많은 사례를 탐색하면 시간이 오래 걸리므로 각각 최대 5개로 제한합니다
- 사례 탐색이 실패해도 셋업 자체는 진행되어야 하므로 에러 시 Phase 3으로 건너뜁니다
- CLAUDE.md가 없으면 후속 스킬이 작동하지 않으므로 기본 템플릿으로 새로 생성합니다
