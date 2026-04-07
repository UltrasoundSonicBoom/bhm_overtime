---
title: "Codex Skills 사용법 완전 가이드 — 설치부터 커스텀 스킬 제작까지"
source: "https://www.gpters.org/dev/post/complete-guide-using-codex-nutBXkvgxKmQuPK"
author: "null"
clipped_at: "2026-03-17T07:54:28Z"
word_count: 876
method: "article-defuddle"
---

## \\"매번 같은 프롬프트 치는 거, 이제 그만하세요\\"

Codex로 작업하다 보면 반복되는 패턴이 생깁니다. PR 리뷰할 때마다 같은 지침을 쓰고, 배포할 때마다 같은 절차를 설명하고, 테스트 코드를 짤 때마다 같은 컨벤션을 알려줍니다.

이걸 한 번 정리해두면? Codex가 알아서 상황에 맞는 워크플로우를 꺼내 씁니다. 그게 **Codex Skills(코덱스 스킬)** 입니다. OpenAI Codex 사용법 중에서 가장 강력한 기능이죠.

![\"상담원](https://tribe-s3-production.imgix.net/4VcGM73QhOqlMbAclmrZ3?auto=compress,format)

## Codex Skills가 뭔가요?

코덱스 스킬(Codex Skills)은 Codex에 특정 작업 능력을 추가하는 패키지입니다. 지침(Instructions), 참고 자료(References), 스크립트(Scripts)를 하나로 묶어서 Codex가 반복 작업을 정확하게 수행하도록 만듭니다.

핵심을 정리하면:

- **재사용 가능한 워크플로우**: 한 번 만들면 프로젝트 전체에서 반복 사용
- **자동 매칭**: 작업 내용에 맞는 스킬을 Codex가 알아서 선택
- **팀 공유**: `.agents/skills` 폴더에 커밋하면 팀원 전체가 사용
- **35+ 공식 스킬**: Vercel 배포, Playwright 테스트, Figma 연동 등 이미 만들어진 스킬

Claude Code의 Skills나 Cursor의 Rules/Skills와 비슷한 개념입니다. 세 도구 모두 SKILL.md 기반의 Agent Skills 오픈 표준을 지원하며, Codex는 `$skill-installer` 로 원클릭 설치가 가능하고 CLI·앱·IDE 확장 어디서든 동작합니다.

## 스킬 설치하기 — 1분이면 끝

### 방법 1: 공식 카탈로그에서 설치

Codex에서 `$skill-installer` 를 실행하면 됩니다.

```
$skill-installer screenshot
```

이 한 줄로 스크린샷 캡처 스킬이 설치됩니다. Codex를 재시작하면 바로 사용 가능합니다.

### 방법 2: GitHub에서 직접 설치

OpenAI의 공식 스킬 저장소에서 원하는 스킬을 찾아 설치합니다:

```
$skill-installer gh-address-comments
```

현재 공식 카탈로그에는 35개의 큐레이션된 스킬이 있고, 커뮤니티 기여 스킬까지 합치면 훨씬 많습니다.

### 방법 3: 팀 레포에 직접 추가

프로젝트 루트에 `.agents/skills/` 폴더를 만들고 스킬 폴더를 넣으면 됩니다. Git push하면 팀원 모두가 바로 사용합니다.

## 스킬 사용하기 — 명시적 vs 암묵적

### 명시적 호출

`$` 프리픽스로 직접 호출합니다:

```
$screenshot https://example.com --fullpage
```

또는 `/skills` 명령으로 사용 가능한 스킬 목록을 확인한 뒤 선택합니다.

### 암묵적 호출 (자동 매칭)

작업을 설명하면 Codex가 알아서 맞는 스킬을 찾아 실행합니다. 예를 들어 \\"이 PR의 코멘트들을 반영해줘\\"라고 하면, `gh-address-comments` 스킬이 자동으로 활성화됩니다.

암묵적 매칭의 정확도는 SKILL.md의 `description` 필드에 달려 있습니다. 잘 작성할수록 Codex가 정확하게 매칭합니다.

---

  

![\"항목](https://tribe-s3-production.imgix.net/CY54EwLpIeYn0AZ4z4Z5U?auto=compress,format)

  
[공식 카탈로그 — 추천 스킬 10선](https://github.com/openai/skills)

현재 큐레이션된 스킬은 35개입니다. 그중 실무에서 바로 쓸만한 10개를 골랐습니다:

스킬

용도

추천 이유

`screenshot`

웹페이지 스크린샷

디자인 리뷰, 버그 리포트에 필수

`gh-address-comments`

PR 코멘트 자동 반영

리뷰 사이클 단축

`vercel-deploy`

Vercel 배포

프리뷰 배포까지 자동

`playwright`

E2E 테스트 (헤드리스)

브라우저 테스트 자동화

`figma-implement-design`

Figma → 코드 변환

디자인을 1:1로 코드 구현

`linear`

Linear 이슈 관리

이슈 생성·업데이트 자동화

`notion-research-documentation`

Notion 리서치 문서화

문서 기반 작업 자동화

`imagegen`

GPT Image 생성

에셋 제작, 목업 생성

`security-best-practices`

보안 베스트 프랙티스

코드 보안 자동 점검

`gh-fix-ci`

CI 에러 진단·수정

빌드 실패 원인 분석 후 자동 수정

## 커스텀 스킬 만들기 — 진짜 핵심

공식 스킬만으로는 부족합니다. 팀만의 워크플로우가 있으니까요. 커스텀 스킬을 직접 만들어봅시다.

### 스킬 구조

```
my-skill/\n├── SKILL.md          ← 필수. 지침과 메타데이터\n├── scripts/          ← 선택. 실행 스크립트\n├── references/       ← 선택. 참고 문서\n├── assets/           ← 선택. 템플릿, 이미지\n└── agents/openai.yaml  ← 선택. UI 설정
```

핵심은 `SKILL.md` 하나입니다. 나머지는 전부 선택사항.

### SKILL.md 작성법

```
---\nname: deploy-staging\ndescription: \"스테이징 서버에 배포하고 헬스체크까지 수행합니다.\n'스테이징 배포', 'staging deploy', '테스트 서버 배포' 등의 키워드에 반응합니다.\"\n---\n\n# 스테이징 배포 스킬\n\n## 절차\n\n1. 현재 브랜치의 변경사항을 확인합니다\n2. 테스트를 실행합니다: npm run test\n3. 스테이징 서버에 배포합니다: ./scripts/deploy-staging.sh\n4. 헬스체크를 수행합니다: curl -f https://staging.example.com/health\n5. 결과를 보고합니다
```

**description이 가장 중요합니다.** 여기에 적힌 키워드로 Codex가 암묵적 매칭을 하기 때문에, 팀원들이 실제로 쓸 만한 표현을 넣어야 합니다.

### 마법사로 쉽게 만들기

직접 작성이 귀찮다면 `$skill-creator` 를 실행하세요. 대화형으로 스킬을 생성해줍니다:

```
$skill-creator\n→ \"스테이징 배포하고 헬스체크까지 해주는 스킬 만들어줘\"
```

### 스킬 저장 위치

위치

경로

범위

프로젝트

`.agents/skills/`

이 프로젝트만

사용자

`~/.agents/skills/`

내 모든 프로젝트

관리자

`/etc/codex/skills/`

시스템 전체

내장

Codex 번들 시스템 스킬

기본 제공 (`$skill-installer`, `$skill-creator` 등)

팀 공유용은 프로젝트 경로에, 개인용은 사용자 경로에 넣으면 됩니다.  

---

## 실전 팁 3가지

### 1\. Claude Skills를 Codex에서 쓰는 법

두 도구 모두 같은 Agent Skills 오픈 표준을 따르기 때문에, Anthropic의 Skills 리포지토리를 Codex에서도 활용할 수 있습니다. 방법은 간단합니다:

1. Claude Skills 저장소를 `.agents/skills/` 에 복제
2. `list-skills` 스크립트를 추가 (skills 폴더의 SKILL.md를 읽어 JSON 출력)
3. AGENTS.md에 \\"list-skills를 실행하여 사용 가능한 skills를 확인하라\\" 지침 추가

이렇게 하면 Claude Code용으로 만든 스킬을 Codex에서도 그대로 활용할 수 있습니다. 단, 이 방법은 커뮤니티에서 발견된 활용법이며 OpenAI/Anthropic이 공식 지원하는 상호 운용 기능은 아닙니다. 기본적인 스킬은 잘 동작하지만, 각 도구 고유의 확장 필드는 무시될 수 있습니다.

### 2\. description을 잘 쓰는 게 전부

암묵적 호출의 성공률은 description에 달려 있습니다. 팁:

- 한국어와 영어 키워드를 모두 포함
- 실제로 팀원이 쓸 법한 표현을 나열
- 이 스킬이 **하지 않는 것** 도 명시 (잘못된 매칭 방지)

```
description: \"PR 리뷰 코멘트를 자동으로 반영합니다.\n'리뷰 반영', 'PR 코멘트', 'address comments', 'fix review' 등에 반응합니다.\n코드 리뷰 자체를 수행하지는 않습니다.\"
```

### 3\. 스킬 비활성화

잘못 매칭되는 스킬이 있다면 삭제하지 않고 비활성화할 수 있습니다. `~/.codex/config.toml` 에 추가:

```
[[skills.config]]\nname = \"problematic-skill\"\nenabled = false
```

## Claude Code Skills vs Codex Skills — 뭐가 다른가요?

Claude Code

Codex

정의 파일

SKILL.md

SKILL.md

설치 방식

`/plugin install` + 수동 복사

`$skill-installer`

공식 카탈로그

[있음](https://github.com/anthropics/skills)

35+ 큐레이션

암묵적 호출

지원

지원

팀 공유

Git 커밋

Git 커밋

실행 환경

CLI + IDE 확장

CLI + 앱 + IDE

두 도구 모두 Agent Skills 오픈 표준(agentskills.io)을 따르기 때문에 같은 SKILL.md 포맷을 쓰고, 기본적인 스킬은 상호 호환이 가능합니다. 다만 각 도구의 확장 기능(Claude Code의 `allowed-tools`, Codex의 `.system` 디렉토리 등)은 호환되지 않을 수 있습니다. 위에서 소개한 크로스 활용 팁을 참고하세요.

---

**참고 자료:**

- [OpenAI Skills 공식 문서](https://developers.openai.com/codex/skills/)
- [Skills GitHub 저장소](https://github.com/openai/skills)
- [Codex에서 Claude Skills 사용하기 (지피터스)](/dev/post/how-use-claude-skills-yyfQxdKhwB87P8J)
- [OpenAI Codex Skills Catalog 리뷰](https://vibecoding.app/blog/openai-skills-review)
