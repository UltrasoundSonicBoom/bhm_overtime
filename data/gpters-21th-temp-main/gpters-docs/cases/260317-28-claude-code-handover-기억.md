---
title: "Claude Code 세션 기억상실 해결법: /handover 커스텀 명령어 만들기"
source: "https://www.gpters.org/dev/post/claude-code-how-fix-5C23eWKWsG2yqwH"
author: "null"
clipped_at: "2026-03-17T07:44:31Z"
word_count: 966
method: "article-defuddle"
---

## 이런 경험, 한 번쯤 있지 않나요?

Claude Code로 한참 작업하다가 세션이 끊겼어요.  
새로 시작했는데, 아까 Claude가 왜 그 파일을 그렇게 고쳤는지 기억을 못 합니다.  
\\"아까 그거 왜 그렇게 했어?\\"라고 물어봐도 \\"무슨 말씀인지 모르겠습니다\\"라는 답만 돌아오죠.  
  

![\"안경을](https://tribe-s3-production.imgix.net/ZsLt8sxyB7XcZ0Q2EYCGo?auto=compress,format)

이게 바로 **세션 기억상실** 문제입니다. Claude Code는 컨텍스트 윈도우(대화 기억 용량)가 가득 차면 자동으로 대화를 압축(auto-compact)하거나, 세션이 바뀌면 이전 대화를 통째로 잊어버립니다.

CLAUDE.md(프로젝트 설명서)에 기본 정보를 적어두면 도움이 되긴 하지만, \\"이번 세션에서 A 방식 대신 B 방식을 택한 이유\\"나 \\"이 버그를 해결하려고 3가지를 시도했는데 첫 두 개는 실패했다\\" 같은 **그 세션에서만 생긴 맥락** 까지 보존하기엔 한계가 있습니다.

이 문제를 해결하는 [아이디어가 커뮤니티](https://x.com/zarazhangrui/status/2020992712825241801) 에서 나왔습니다. `/handover` **커스텀 명령어** 입니다.

---

## /handover가 뭔가요?

![\"폴더](https://tribe-s3-production.imgix.net/B9dyHTwrjgDi38N7uoAho?auto=compress,format)

한마디로, **교대 근무 인수인계서 자동 생성기** 입니다.

세션 중 아무 때나 `/handover` 를 입력하면, Claude가 그동안의 대화 내용을 쭉 훑어보고 **HANDOVER.md** 라는 파일을 자동으로 만들어 줍니다. 다음 세션에서 Claude가 이 파일을 읽으면, 이전에 무슨 일이 있었는지 바로 파악할 수 있습니다.

### 핸드오버 문서에는 이런 게 담깁니다

항목

예시

작업 내용 & 완료 사항

\\"로그인 API 연동 완료, 회원가입 페이지 50% 진행\\"

성공/실패 기록

\\"JWT 방식은 CORS 문제로 실패 → 세션 쿠키로 변경\\"

주요 결정 사항

\\"성능 이슈로 React Query 대신 SWR 채택\\"

배운 교훈 & 주의사항

\\"이 API는 rate limit이 분당 10회라 주의\\"

다음 단계

\\"회원가입 폼 유효성 검사 → 이메일 인증 연동\\"

중요 파일 맵

\\"src/auth/login.ts, src/api/client.ts\\"

포인트는 단순한 대화 요약이 아니라는 겁니다. **왜 그런 결정을 내렸는지, 어디서 막혔는지, 뭘 조심해야 하는지** 까지 담깁니다. 다음 세션의 Claude가 \\"이전 나\\"의 맥락을 그대로 물려받는 셈이에요.

## 직접 만들어보기: /handover 커스텀 명령어 설정

설정은 간단합니다. 마크다운 파일 하나만 만들면 됩니다.

### Step 1: 폴더 만들기

터미널(맥은 터미널 앱, 윈도우는 명령 프롬프트)에서 프로젝트 폴더로 이동한 뒤 아래 명령어를 실행합니다.

```
mkdir -p .claude/commands\n
```

> `.claude/commands/` 폴더는 Claude Code의 커스텀 명령어가 저장되는 곳입니다. 이 폴더에 마크다운(.md) 파일을 넣으면, 파일 이름이 곧 `/명령어` 이름이 됩니다.

### Step 2: handover.md 파일 만들기

`.claude/commands/handover.md` 파일을 만들고, 아래 내용을 프롬프트로 붙여넣으세요.

```
지금까지의 대화 전체를 분석해서 HANDOVER.md 파일을 프로젝트 루트에 생성해줘.\n\n아래 항목을 반드시 포함할 것:\n\n## 작업 요약\n- 이번 세션에서 작업한 내용과 완료된 사항\n\n## 성공/실패 기록\n- 어떤 접근이 통했고, 어떤 버그를 어떻게 해결했는지\n- 시도했지만 실패한 방법과 그 이유\n\n## 주요 결정 사항\n- 내린 결정과 그 이유 (왜 A 대신 B를 택했는지)\n\n## 주의사항 & 교훈\n- 다음 세션에서 주의할 점, 반복하면 안 되는 실수\n\n## 다음 단계\n- 이어서 해야 할 작업 목록 (우선순위 포함)\n\n## 중요 파일 맵\n- 이번 세션에서 주로 다룬 파일 경로와 역할\n\n파일명은 HANDOVER.md로 해줘.\n날짜별로 관리하고 싶으면 HANDOVER-YYYY-MM-DD.md 형식도 좋아.\n
```

### Step 3: 사용하기

Claude Code 세션에서 아래와 같이 입력하면 됩니다.

```
/handover
```

Claude가 대화 내용을 분석해서 HANDOVER.md를 프로젝트 폴더에 생성합니다. 다음 세션을 시작할 때 Claude가 이 파일을 자동으로 읽거나, \\"HANDOVER.md 읽어줘\\"라고 요청하면 이전 맥락을 바로 이어갈 수 있습니다.

> 참고: `.claude/commands/` 에 만든 명령어는 해당 프로젝트에서만 동작합니다. 모든 프로젝트에서 쓰고 싶다면 `~/.claude/commands/` 폴더(홈 디렉토리)에 파일을 넣으면 됩니다.

## 한 단계 더: auto-compact 될 때 자동으로 핸드오버 생성하기

수동으로 `/handover` 를 치는 것도 좋지만, 솔직히 까먹기 쉽습니다. 특히 컨텍스트가 꽉 차서 auto-compact이 실행되는 순간 — 그때가 핸드오버가 가장 필요한 타이밍인데, 대화가 압축된 뒤에는 이미 늦어요.

여기서 **PreCompact 훅(Hook)** 이 등장합니다.

### 훅이 뭔가요?

훅은 \\"특정 이벤트가 발생할 때 자동으로 실행되는 스크립트\\"입니다.  
Claude Code에는 여러 가지 훅 이벤트가 있는데, 그 중 하나가 **PreCompact** — 대화가 압축되기 직전에 실행되는 훅입니다.

즉, \\"Claude Code가 대화를 압축하려고 하면 → 그 전에 먼저 이 스크립트를 실행해라\\"라고 지정할 수 있습니다.

### Step 1: 핸드오버 생성 스크립트 만들기

`.claude/hooks/pre-compact-handover.sh` 파일을 만들고 아래 내용을 넣으세요.

```
#!/bin/bash\n# auto-compact 직전에 핸드오버 문서를 자동 생성하는 스크립트\n\n# stdin으로 들어오는 JSON에서 대화 기록 파일 경로를 읽습니다\nINPUT=$(cat)\nTRANSCRIPT_PATH=$(echo \"$INPUT\" | jq -r '.transcript_path')\nPROJECT_DIR=$(echo \"$INPUT\" | jq -r '.cwd')\n\n# 오늘 날짜로 파일명 생성\nTODAY=$(date +%Y-%m-%d)\nOUTPUT_FILE=\"$PROJECT_DIR/HANDOVER-$TODAY.md\"\n\n# 대화 기록을 Claude에게 보내서 핸드오버 요약을 생성\ncat \"$TRANSCRIPT_PATH\" | claude -p \"이 대화 기록을 분석해서 핸드오버 문서를 작성해줘.\n\n아래 항목을 포함해줘:\n- 작업 요약 (뭘 했고 뭘 끝냈는지)\n- 성공/실패 기록 (어떤 접근이 통했고 실패했는지)\n- 주요 결정 사항 (왜 그렇게 결정했는지)\n- 주의사항 & 교훈\n- 다음 단계\n- 중요 파일 맵\n\n마크다운 형식으로 작성해줘.\" > \"$OUTPUT_FILE\"\n\necho \"핸드오버 문서 생성 완료: $OUTPUT_FILE\"\nexit 0\n
```

> `claude -p` 는 Claude Code의 파이프 모드입니다. 스크립트 안에서 Claude를 호출해서 텍스트를 처리할 수 있어요. 즉, \\"대화 기록을 새 Claude에게 넘겨서 요약해달라\\"는 동작입니다.

만든 뒤 실행 권한을 부여합니다.

```
chmod +x .claude/hooks/pre-compact-handover.sh
```

### Step 2: 훅 설정하기

`.claude/settings.local.json` 파일을 열고 (없으면 새로 만들고) 아래 내용을 추가합니다.

```
{\n  \"hooks\": {\n    \"PreCompact\": [\n      {\n        \"matcher\": \"auto\",\n        \"hooks\": [\n          {\n            \"type\": \"command\",\n            \"command\": \"\\\"$CLAUDE_PROJECT_DIR\\\"/.claude/hooks/pre-compact-handover.sh\"\n          }\n        ]\n      }\n    ]\n  }\n}\n
```

핵심 포인트를 짚어볼게요.

- `\"matcher\": \"auto\"` — 자동 compact일 때만 실행됩니다. `/compact` 를 직접 치면 실행되지 않아요. 의도적으로 compact할 때까지 핸드오버를 만들 필요는 없으니까요.
- `\"type\": \"command\"` — 셸 스크립트를 실행하겠다는 뜻입니다.
- `$CLAUDE_PROJECT_DIR` — 프로젝트 루트 경로를 자동으로 넣어줍니다. 어디서 실행하든 스크립트를 찾을 수 있습니다.

### 작동 흐름 정리

```
대화를 계속 하다가 컨텍스트 윈도우가 가득 참\n  ↓\nClaude Code가 auto-compact 시작하려 함\n  ↓\nPreCompact 훅이 먼저 실행됨\n  ↓\n대화 기록이 아직 온전한 상태에서 전체 내용을 읽음\n  ↓\n새 Claude 인스턴스(claude -p)가 핸드오버 요약을 생성\n  ↓\nHANDOVER-2026-02-11.md로 저장\n  ↓\n그 다음에 auto-compact 진행\n
```

타이밍이 중요합니다. 압축이 끝난 뒤에 요약하면 이미 정보가 날아간 상태이기 때문에,  
**압축 직전에 원본을 읽는 것** 이 핵심이에요.

## 수동 + 자동, 둘 다 쓰면 좋은 이유

PreCompact 훅을 설정해뒀더라도, 앞서 만든 `/handover` 커스텀 명령어는 따로 유지하는 게 좋습니다.

상황

사용 방법

컨텍스트 윈도우가 가득 찬 경우

PreCompact 훅이 **자동** 으로 핸드오버 생성

세션을 의도적으로 마무리할 때

`/handover` **수동** 실행

복잡한 작업 중간에 기록을 남기고 싶을 때

`/handover` **수동** 실행

---

이 아이디어가 흥미로운 건, Claude Code의 근본적 한계 — 세션 간 기억상실 — 을  
Claude Code 자체 기능(커스텀 명령어, 훅)으로 해결한다는 점입니다.  
도구의 한계를 도구 안에서 우회하는 셈이에요.

사실 Anthropic도 이 문제를 인식하고 있습니다.  
Tasks 기능으로 세션 간 상태 공유가 가능해졌고, `claude --continue` 로 이전 대화를 이어갈 수도 있습니다. 하지만 이런 공식 기능은 **\\"대화를 통째로 이어가는\\"** 방식이고,  
/handover는 **\\"핵심만 추출해서 넘기는\\"** 방식입니다.

오히려 실무에서는 /handover 쪽이 더 효율적일 수 있습니다. 100턴짜리 대화를 통째로 이어가는 것보다, 핵심 결정과 교훈만 정리된 1페이지 문서를 넘기는 게 Claude 입장에서도 컨텍스트 윈도우를 덜 차지하니까요!
