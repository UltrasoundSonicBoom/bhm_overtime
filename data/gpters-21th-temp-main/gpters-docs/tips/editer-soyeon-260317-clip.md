---
title: "editor_소연 - AI 커뮤니티 - 지피터스"
source: "https://www.gpters.org/member/WZlPiwwnpW"
author: "null"
clipped_at: "2026-03-17T07:52:35Z"
word_count: 760
method: "article-defuddle"
---

![\"흰색](https://tribe-s3-production.imgix.net/yvHnzcoyaZl0ztlfGohPb?auto=compress,format)

  
OpenAI Codex에 서브에이전트 기능이 정식 출시됐어요. AI 에이전트 여러 개를 동시에 띄워서 코드베이스 탐색, 기능 구현, 테스트를 병렬로 처리할 수 있어요.

## 서브에이전트가 뭔가요?

서브에이전트(Subagents)는 Codex가 전문화된 AI 에이전트를 여러 개 동시에 생성하고,  
결과를 하나로 모아주는 기능이에요.

쉽게 말하면, 혼자 코딩하던 AI 에이전트가 **팀을 꾸려서 일하는 것** 과 같아요. 코드베이스 탐색은 탐색 전문 에이전트가, 코드 작성은 구현 전문 에이전트가, 테스트는 테스트 전문 에이전트가 각각 맡아서 동시에 처리해요.

## 내장 에이전트 3종

Codex는 기본으로 3가지 에이전트를 제공해요:

에이전트

역할

언제 쓰나

**default**

범용

특별한 지정 없을 때 기본으로 사용

**worker**

구현 전문

코드 작성, 버그 수정, 리팩토링

**explorer**

탐색 전문

코드베이스 읽기, 구조 파악, 의존성 추적

대부분의 작업은 이 3가지로 충분해요.  
하지만 팀마다 반복되는 패턴이 있다면, 커스텀 에이전트를 만들 수도 있어요.

## 커스텀 에이전트 만들기

커스텀 에이전트는 TOML 파일 하나로 정의해요. `~/.codex/agents/` (개인용) 또는 `.codex/agents/` (프로젝트용)에 넣으면 돼요.

### 기본 구조

```
# ~/.codex/agents/pr_reviewer.toml\n\nname = \"pr_reviewer\"\ndescription = \"PR 코드 리뷰 전문 에이전트. 보안 취약점, 성능 이슈, 코드 스타일을 점검한다\"\n\n[developer_instructions]\ntext = \"\"\"\n- PR diff를 읽고 라인별로 코멘트를 남겨라\n- 보안 취약점은 반드시 플래그하라\n- 성능 이슈가 있으면 대안을 제시하라\n- 코드 스타일은 팀 컨벤션 기준으로 판단하라\n\"\"\"\n\nmodel = \"gpt-5.3-codex-spark\"\nmodel_reasoning_effort = \"medium\"\nsandbox_mode = \"read-only\"\n
```

### 주요 설정 항목

필드

필수

설명

`name`

O

에이전트 식별자

`description`

O

언제 이 에이전트를 써야 하는지 설명

`developer_instructions`

O

에이전트의 핵심 행동 지침

`model`

X

사용할 모델 (기본: gpt-5.4)

`model_reasoning_effort`

X

추론 강도 (low/medium/high)

`sandbox_mode`

X

샌드박스 모드 (read-only 등)

`nickname_candidates`

X

UI에서 표시할 이름 후보 목록

![\"코드가](https://tribe-s3-production.imgix.net/xh8M9pITt5EDAqxl4m5z4?auto=compress,format)

### 팁: 좋은 커스텀 에이전트의 조건

**좁고 확실하게** 만드는 게 핵심이에요. 하나의 에이전트가 한 가지 일만 잘 하도록 설계하세요. \\"뭐든 할 수 있는 만능 에이전트\\"보다 \\"보안 리뷰만 하는 에이전트\\"가 훨씬 정확해요.

---

## 병렬 실행 — 어떻게 작동하나?

서브에이전트의 핵심은 **병렬 실행** 이에요. Codex가 작업을 분석해서 독립적으로 수행 가능한 부분을 자동으로 나누고, 각 에이전트에 할당해요.

### 작동 방식

1. Codex가 작업을 분석하고 병렬화 가능한 부분을 식별
2. Git worktree를 활용해 에이전트마다 독립된 작업 사본 생성
3. 각 에이전트가 자신의 사본에서 독립적으로 작업
4. 결과를 수집하고 하나의 응답으로 통합

### 글로벌 설정

```
# config.toml 또는 .codex/config.toml\n\n[agents]\nmax_threads = 6           # 동시 실행 에이전트 수 (기본: 6)\nmax_depth = 1             # 에이전트 중첩 깊이 (기본: 1)\njob_max_runtime_seconds = 300  # CSV 배치 작업 타임아웃\n
```

`max_threads` 를 늘리면 더 많은 에이전트를 동시에 돌릴 수 있지만, 토큰 소비도 비례해서 늘어나요.

## 실전 활용 — 이런 상황에서 써보세요

### 활용 1: 코드베이스 탐색

새 프로젝트에 투입됐을 때, 서브에이전트 여러 개가 동시에 코드를 읽고 구조를 파악해요.

```
\"이 프로젝트의 인증 흐름, DB 스키마, API 엔드포인트를 각각 분석해줘\"\n
```

→ explorer 에이전트 3개가 동시에 탐색하고 결과를 종합해요.

### 활용 2: 멀티 파일 기능 구현

여러 파일에 걸친 기능을 구현할 때, 각 파일을 담당하는 worker 에이전트가 동시에 작업해요.

```
\"사용자 프로필 API를 만들어줘 — 모델, 라우터, 테스트 각각 작성해\"\n
```

→ worker 에이전트 3개가 모델, 라우터, 테스트를 동시에 작성해요.

### 활용 3: CSV 배치 감사 (실험적)

`spawn_agents_on_csv` 기능으로 CSV의 각 행에 대해 에이전트를 생성할 수 있어요. 대량 코드 감사나 반복 작업에 유용해요.

- CSV를 읽고 행마다 worker 에이전트 생성
- 각 에이전트가 `report_agent_job_result` 로 결과 보고
- 최종 결과를 CSV로 내보내기

### 주의: 병렬 작업의 함정

읽기 작업(탐색, 테스트, 요약)은 병렬이 잘 돼요. 하지만 **쓰기 작업을 동시에 돌리면 충돌이 생길 수 있어요**. 같은 파일을 여러 에이전트가 동시에 수정하면 머지 충돌이 발생하거든요.

**경험 법칙**: 읽기 → 과감하게 병렬화, 쓰기 → 파일 단위로 분리해서 병렬화.

![\"codex](https://tribe-s3-production.imgix.net/f2W30FEtouwmD6ntbPrvR?auto=compress,format)

## 모델 선택 가이드

서브에이전트마다 다른 모델을 지정할 수 있어요. 작업 복잡도에 따라 골라 쓰면 비용을 최적화할 수 있어요:

모델

추천 용도

특징

**gpt-5.4**

복잡한 구현, 아키텍처 설계

가장 강력, 기본값

**gpt-5.3-codex-spark**

탐색, 간단한 수정, 리뷰

빠르고 가벼움

탐색 전용 에이전트는 `gpt-5.3-codex-spark` 으로 설정하면 비용은 줄이고 속도는 올릴 수 있어요.

## 샌드박스와 권한

서브에이전트는 **부모 에이전트의 샌드박스 정책을 그대로 상속** 해요. 즉, 부모가 read-only면 서브에이전트도 read-only예요.

인터랙티브 세션에서는 서브에이전트가 승인이 필요한 작업을 하면 스레드 라벨과 함께 승인 요청이 표시돼요. 어떤 에이전트가 무슨 작업을 하는지 한눈에 볼 수 있어요.

## Claude Code와 비교하면?

Codex 서브에이전트와 비슷한 개념이 Claude Code에도 있어요:

항목

Codex 서브에이전트

Claude Code Agent

설정 방식

TOML 파일

Agent 도구 호출

병렬 실행

worktree 기반

worktree 기반

커스텀 에이전트

TOML로 정의

프롬프트로 정의

모델 선택

gpt-5.4 / spark

opus / sonnet / haiku

CSV 배치

지원 (실험적)

미지원

핵심 차이는 Codex가 **설정 파일 기반** 인 반면, Claude Code는 **대화 중 동적으로** 에이전트를 생성한다는 점이에요.

## 자주 묻는 질문

### Codex 서브에이전트는 무료인가요?

서브에이전트 기능 자체는 Codex에 포함되어 있지만, 각 에이전트가 독립적으로 토큰을 소비해요. 병렬로 6개를 돌리면 토큰 사용량도 그만큼 늘어나요.

### 서브에이전트끼리 통신할 수 있나요?

직접 통신은 안 돼요. 각 에이전트는 독립적으로 작업하고, 결과를 부모 에이전트가 수집해서 종합해요.

### IDE에서도 쓸 수 있나요?

현재 Codex 앱과 CLI에서 사용 가능해요. IDE Extension 지원은 곧 추가될 예정이에요.
