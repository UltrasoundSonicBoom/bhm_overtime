---
title: "Claude Code에 cronjob이 생겼다 — /loop 명령어 실전 활용법"
source: "https://www.gpters.org/llm-service/post/cronjob-has-created-claude-20S8GgNwDCSdkR9"
author: "null"
clipped_at: "2026-03-17T07:54:57Z"
word_count: 416
method: "article-defuddle"
---

## \\"5분마다 확인해줘\\"가 된다면?

![\"일정에](https://tribe-s3-production.imgix.net/9L9ygsDS0hZkkCvB0bwgb?auto=compress,format)

Claude Code로 작업하다 보면 이런 순간이 있어요. 배포 끝나면 알려줘, PR 리뷰 올라오면 확인해줘, 빌드 깨지면 바로 고쳐줘. 매번 직접 명령어를 치는 건 비효율적이잖아요.

Claude Code에 `/loop` 명령어가 추가되면서, 이제 반복 작업을 cron처럼 자동으로 돌릴 수 있게 됐어요. 한 줄이면 설정 끝이에요.

## 이번 업데이트 뭔가요?

`/loop` 은 Claude Code에 내장된 반복 실행 명령어예요. 쉽게 말하면 **터미널 안의 cronjob** 이에요. 지정한 간격으로 슬래시 커맨드나 프롬프트를 자동 반복 실행해줘요.

원래는 호주 개발자가 만든 5줄짜리 Bash 스크립트(Ralph Loop)에서 시작했는데, 커뮤니티에서 반응이 좋아 Anthropic이 공식 기능으로 채택했어요. Claude Code 창시자 Boris Cherny가 직접 반영한 기능이에요.

## 핵심 기능

1. **한 줄 설정**: `/loop 5m /foo` 처럼 간격과 명령어만 넣으면 끝. cron 표현식을 외울 필요 없어요.
2. **자동 만료**: 생성 후 3일이 지나면 자동 삭제돼요. 깜빡 잊고 무한으로 돌아가는 걸 방지해줘요.
3. **세션 스코프**: Claude Code가 켜져 있는 동안만 작동해요. 터미널을 닫으면 자동으로 중단돼요.
4. **cron 표현식 지원**: 고급 사용자는 `분 시 일 월 요일` 형태의 5필드 cron 표현식도 쓸 수 있어요. 와일드카드(`*`), 스텝(`*/15`), 범위(`1-5`), 리스트(`1,15,30`) 전부 지원해요.

## 이렇게 써보세요 — 실전 활용법

### 활용 1: 배포 모니터링

배포 후 상태를 5분마다 자동으로 확인하고 싶을 때:

```
/loop 5m check deployment status\n
```

빌드가 실패하면 Claude가 알려주고, 원인 분석까지 해줘요. \\"배포 끝나면 알려줘\\"를 반복해서 칠 필요가 없어요.

### 활용 2: PR 감시

팀원의 PR 리뷰를 기다리는 동안:

```
/loop 10m check if there are new PR reviews or comments\n
```

새 코멘트가 달리면 즉시 파악할 수 있어요. GitHub 알림을 계속 새로고침하는 것보다 편해요.

### 활용 3: 테스트 자동 재실행

코드를 수정할 때마다 테스트를 자동으로 돌리고 싶다면:

```
/loop 3m run tests and fix any failures\n
```

테스트가 깨지면 Claude가 직접 고치고, 다시 테스트를 돌려요. 수정 → 테스트 → 수정 사이클이 자동으로 돌아가는 거예요.

### 활용 4: 로그 모니터링

프로덕션 로그에서 에러를 실시간으로 잡고 싶을 때:

```
/loop 5m check error logs and summarize new issues\n
```

에러 패턴을 감지하면 요약해서 보여줘요.

*Photo by* [*Logan Voss*](https://unsplash.com/@loganvoss) *on* [*Unsplash*](https://unsplash.com/)

## 요금 & 시작하기

`/loop` 은 Claude Code에 내장된 기능이라 별도 설치가 필요 없어요. Claude Code가 설치되어 있다면 바로 사용할 수 있어요.

**비용 주의사항**: 루프가 한 번 돌 때마다 Claude API 토큰을 소모해요. 복잡한 작업을 짧은 간격으로 돌리면 비용이 빠르게 올라갈 수 있어요. 처음에는 10분 이상의 넉넉한 간격으로 시작하는 걸 추천해요.

**세션 의존성**: `/loop` 은 Claude Code 세션이 열려 있는 동안만 작동해요. 터미널을 닫으면 모든 루프가 중단돼요. 세션과 무관하게 돌려야 하는 영구적 작업이라면 시스템 cron이나 `claude -p` 헤드리스 모드를 조합하는 게 나아요.

**시작 방법**:

1. Claude Code 터미널 열기
2. `/loop [간격] [할 일]` 입력
3. 끝!
