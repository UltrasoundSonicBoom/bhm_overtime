---
title: "Y Combinator의 AI 에이전트 사용법 완벽 정리 - Gstack"
source: "https://www.gpters.org/nocode/post/complete-guide-using-y-Ctg4mEpXdCUJjek"
author: "null"
clipped_at: "2026-03-17T07:56:09Z"
word_count: 828
method: "article-defuddle"
---

![\"항목](https://tribe-s3-production.imgix.net/mdkqqR7Jrv8K3Coy68AdG?auto=compress,format)

Gstack은 Claude Code에 역할별 전문가 모드를 부여하는 오픈소스 스킬 모음이에요. Y Combinator CEO 개리 탄(Garry Tan)이 직접 만들어서 GitHub에 공개했는데요. 슬래시 커맨드 하나로 CEO 관점 리뷰, 아키텍처 설계, 코드 리뷰, 자동 배포, QA 테스트까지 — 한 사람이 8명의 전문가를 데리고 일하는 것처럼 개발할 수 있어요.

이 글에서는 Gstack의 GitHub README와 최신 외부 리뷰를 종합해서, 9가지 핵심 포인트를 정리해볼게요.

## 1\. 왜 Gstack이 필요한가 — \\"역할 분리\\"라는 발상

Claude Code는 똑똑하지만 한 가지 모드로만 동작해요. 코드를 짜달라고 하면 바로 짜기 시작하지, \\"이거 진짜 만들어야 하는 게 맞아?\\"라고 먼저 묻지는 않아요.

개리 탄은 이걸 **역할의 부재** 문제로 봤어요. 실제 개발 팀에는 다른 사람들이 다른 역할을 해요:

- CEO는 \\"뭘 만들지\\"를 결정하고
- 엔지니어링 매니저는 \\"어떻게 만들지\\"를 설계하고
- 시니어 엔지니어는 코드 리뷰에서 버그를 잡고
- QA는 실제 화면을 돌려보며 테스트해요

Gstack은 이 역할들을 각각 **슬래시 커맨드** 로 만들어서, 상황에 맞는 전문가를 호출하는 구조예요.

## 2\. /plan-ceo-review — 코드를 짜기 전에 방향부터 잡기

이 스킬의 역할은 \\"파운더/CEO 관점 리뷰\\"예요. 사용자의 요청을 받아서 더 큰 그림에서 재검토해요.

**언제 쓰면 좋을까?**

- 새 기능을 기획할 때
- \\"이 방향이 맞나?\\" 확신이 없을 때
- 10배 더 좋은 제품이 될 수 있는지 도전해보고 싶을 때

3가지 모드를 지원해요:

- **SCOPE EXPANSION**: 더 크게 생각하기
- **HOLD SCOPE**: 현재 범위 내에서 최대 리거(rigor)
- **SCOPE REDUCTION**: 핵심만 남기기

## 3\. /plan-eng-review — 아키텍처를 잠그는 엔지니어링 매니저

CEO 리뷰가 \\"뭘 만들지\\"를 정했다면, 이 스킬은 \\"어떻게 만들지\\"를 잠가요. 아키텍처, 데이터 흐름, 다이어그램, 엣지 케이스, 테스트 커버리지, 성능까지 따져요.

실제 엔지니어링 매니저처럼 **의견이 확고한(opinionated) 추천** 을 해줘서, \\"알아서 해\\"가 아니라 \\"이렇게 하자, 이유는 이거야\\"라는 방식이에요.

## 4\. /review — 프로덕션에서 터질 버그를 잡는 스태프 엔지니어

CI를 통과했는데도 프로덕션에서 터지는 버그, 경험해보셨나요? 이 스킬은 그런 종류의 문제를 찾아요.

main 브랜치 대비 diff를 분석하면서:

- SQL 안전성
- LLM 신뢰 경계 위반
- 조건부 사이드 이펙트
- 기타 구조적 이슈

를 집중적으로 검사해요. **Greptile 연동** 도 지원해서, 자동 코드 리뷰 코멘트 중 진짜 문제와 오탐을 구별해줘요.

## 5\. /ship — 릴리스 엔지니어의 최종 실행

코드가 준비됐으면 배포할 차례예요. `/ship` 은 이 과정을 자동화해요:

1. main 브랜치와 머지
2. 테스트 실행
3. diff 최종 리뷰
4. VERSION 범프
5. CHANGELOG 업데이트
6. 커밋 → 푸시 → PR 생성

한 줄 커맨드로 릴리스 파이프라인 전체를 돌릴 수 있어요.

## 6\. /browse + /qa — 실제 화면을 보는 QA 팀

Gstack에서 가장 기술적으로 인상적인 부분이에요. Playwright 기반 헤드리스 브라우저(~58MB)가 내장되어 있어서, AI가 실제로 웹 페이지를 열고 테스트할 수 있어요.

**핵심 기술 포인트**:

- **장기 실행 데몬 방식**: 매번 브라우저를 새로 띄우지 않아요. 한 번 시작하면 쿠키, localStorage, 로그인 상태가 유지돼요
- **콜드 스타트 3~5초**, 이후 호출은 **100~200ms**
- **Diff-Aware 테스트**: git diff를 읽어서 변경된 페이지만 골라서 테스트해요

`/qa` 는 QA 리드 역할로 문제를 찾고 코드까지 수정하고, `/qa-only` (qa-reporter)는 테스트 결과만 보고해요.

## 7\. /setup-browser-cookies — 로그인된 상태로 테스트하기

QA 테스트의 가장 큰 걸림돌이 \\"로그인\\"이에요. 실제 서비스는 대부분 인증이 필요한데, 테스트 계정을 매번 세팅하기 번거롭잖아요.

이 스킬은 **실제 브라우저에서 쿠키를 가져와요**:

- Chrome, Arc, Brave, Edge, Comet 지원
- 인터랙티브 UI에서 어떤 도메인의 쿠키를 가져올지 선택 가능

덕분에 로그인이 필요한 페이지도 바로 QA 돌릴 수 있어요.

## 8\. /retro — 팀 단위 회고와 트렌드 추적

주간 엔지니어링 회고를 자동으로 생성해요. 커밋 히스토리, 작업 패턴, 코드 품질 메트릭을 분석하고요.

**팀 인식(Team-Aware)** 기능이 있어서:

- 팀원별 커밋 수, LOC, 테스트 커버리지, 배포 패턴을 분석
- 잘한 점(praise)과 성장 포인트(growth areas)를 구분
- JSON 스냅샷을 저장해서 회고 간 트렌드를 추적

혼자 쓰는 것도 좋지만, 팀 프로젝트에서 더 빛나는 기능이에요.

## 9\. 설치는 명령어 한 줄

Gstack 사용법의 시작은 설치인데, 놀랍도록 간단해요.

**글로벌 설치** (내 모든 프로젝트에서 사용):

```
git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

**프로젝트별 설치** (팀과 공유):

```
cp -Rf ~/.claude/skills/gstack .claude/skills/gstack && rm -rf .claude/skills/gstack/.git && cd .claude/skills/gstack && ./setup
```

**필요한 것**:

- Git
- Bun v1.0 이상
- Claude Code 액세스
- macOS 또는 Linux (x64, arm64)

## 마무리 — 9가지 스킬 한눈에 보기

스킬

역할

한줄 설명

`/plan-ceo-review`

CEO

방향성 재검토, 10배 더 좋은 제품 찾기

`/plan-eng-review`

엔지니어링 매니저

아키텍처, 데이터 흐름, 엣지 케이스

`/review`

스태프 엔지니어

CI 통과했지만 프로덕션에서 터질 버그

`/ship`

릴리스 엔지니어

머지 → 테스트 → PR까지 원클릭

`/browse`

QA 엔지니어

헤드리스 브라우저로 페이지 테스트

`/qa`

QA 리드

Diff-Aware 자동 테스트 + 수정

`/qa-only`

QA 리포터

테스트 결과 보고만

`/setup-browser-cookies`

세션 매니저

실제 브라우저 쿠키 가져오기

`/retro`

엔지니어링 매니저

팀 단위 회고, 트렌드 추적

## 자주 묻는 질문

### Gstack은 무료인가요?

네, 완전 무료 오픈소스예요. GitHub에서 누구나 클론해서 사용할 수 있어요. 별도의 API 키나 라이선스 비용은 없고, Claude Code 구독만 있으면 돼요.

### Gstack 설치하려면 뭐가 필요한가요?

Git, Bun v1.0 이상, Claude Code 액세스가 필요해요. 플랫폼은 macOS와 Linux(x64, arm64)를 지원해요. Windows는 WSL을 통해 사용할 수 있어요.

### Gstack과 일반 Claude Code의 차이점은?

일반 Claude Code는 범용 어시스턴트예요. 뭘 시키든 같은 모드로 응답해요. Gstack은 역할별로 다른 페르소나를 부여해서, CEO 관점 리뷰 / 코드 리뷰 / QA / 배포 등 상황에 맞는 전문가를 호출할 수 있어요.

### Gstack의 브라우저 기능은 어떻게 동작하나요?

Playwright 기반 헤드리스 Chromium을 장기 실행 데몬으로 띄워요. 매번 새 브라우저를 시작하지 않기 때문에 쿠키, 로그인 상태가 유지되고, 콜드 스타트 후에는 100~200ms로 빠르게 응답해요.
