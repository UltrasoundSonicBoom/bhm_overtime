---
title: "gws CLI 설치부터 MCP 연동까지 — 구글 워크스페이스 통합 CLI 활용법"
source: "https://www.gpters.org/dev/post/gws-cli-installation-mcp-8po23BHjvWxn35H"
author: "null"
clipped_at: "2026-03-17T07:11:55Z"
word_count: 550
method: "article-defuddle"
---

## Gmail, Drive, Calendar… 터미널 하나로 다 되면 어떨까요?

구글 워크스페이스를 쓰면서 브라우저 탭을 수십 개씩 열어본 적 있으실 겁니다.  
Gmail 확인하고, Drive에서 파일 찾고, Calendar 일정 확인하고, Sheets 데이터 꺼내고.  
이 모든 걸 터미널 명령어 하나로 처리할 수 있는 구글 워크스페이스 CLI 도구 `gws` 가 오픈소스로 공개됐습니다.

특히 MCP 서버 모드를 지원해서 Claude Desktop이나 Gemini CLI 같은  
AI 에이전트와 바로 연결된다는 점이 눈에 띕니다.

![\"Google](https://tribe-s3-production.imgix.net/W43FSvniMEOgqVCuZDQRp?auto=compress,format)

## gws가 뭔가요?

\\"One CLI for all of Google Workspace — built for humans and AI agents\\"

구글 워크스페이스의 모든 API에 접근할 수 있는 통합 CLI 도구입니다. Rust로 작성되어 빠르고, npm으로 간단히 설치할 수 있습니다. 파일 관리, 이메일, 캘린더, 스프레드시트 등을 터미널에서 바로 제어합니다.

핵심을 정리하면 이렇습니다:

- **통합 CLI**: Drive, Gmail, Calendar, Sheets, Docs, Chat, Admin을 하나의 명령어 체계로 접근
- **동적 API 빌드**: Google Discovery Service를 런타임에 읽어서 명령어를 자동 생성 — 구글이 API를 추가하면 gws도 자동 반영
- **AI 에이전트 지원**: MCP 서버 모드로 Claude Desktop, Gemini CLI 등과 바로 연동 가능
- **100개 이상의 에이전트 스킬**: AI가 워크스페이스를 관리할 수 있는 사전 정의된 스킬 제공

## 핵심 기능

### 1\. 사람을 위한 CLI

터미널에서 자연스럽게 사용할 수 있도록 설계됐습니다. 탭 완성(Tab completion), 모든 리소스에 대한 `--help`, 요청 미리보기를 위한 `--dry-run`, 자동 페이지네이션을 지원합니다.

```
# 설치\nsudo npm install -g @googleworkspace/cli\n\n# 초기 설정 (브라우저로 OAuth 인증)\ngws auth login\n\n# 사용 예시\ngws drive files list --spaces \"TkgRGluK_SM\"\n
```

### 2\. AI 에이전트를 위한 MCP 서버

gws의 차별점은 MCP(Model Context Protocol) 연동입니다. AI 에이전트가 구글 워크스페이스를 직접 조작할 수 있게 해줍니다.

```
# MCP 서버 모드로 실행\ngws mcp\n\n# 브릿지 모드 (stdio → SSE 변환)\ngws mcp --bridge\n
```

Claude Desktop, Gemini CLI에서 MCP 서버로 등록하면, AI에게 \\"내일 오전 회의 잡아줘\\"라고 말하는 것만으로 Calendar에 일정이 생성됩니다.

*Photo by* [*Rohit Choudhari*](https://unsplash.com/@iamrohitchoudhari) *on* [*Unsplash*](https://unsplash.com/)

### 3\. 지원 서비스 범위

현재 gws가 지원하는 구글 워크스페이스 서비스입니다:

서비스

주요 기능

**Drive**

파일 업로드/다운로드/공유

**Gmail**

메일 조회/전송/필터

**Calendar**

일정 조회/생성/초대

**Sheets**

스프레드시트 CRUD

**Docs**

문서 작성/편집

**Chat**

채팅 메시지 관리

**Admin**

사용자/그룹 관리

## 이렇게 써보세요 — 실전 활용법

### 활용 1: 5분 만에 설치하고 시작하기

Rust로 작성됐지만, npm으로 바로 설치할 수 있어서 Node.js 환경만 있으면 됩니다.

```
# 1. 설치\nnpm install -g @googleworkspace/cli\n\n# 2. OAuth 인증 (브라우저 팝업)\ngws auth login\n\n# 3. 바로 사용 시작\ngws drive files list\ngws gmail messages list --user-id me\ngws calendar events list --calendar-id primary\n
```

### 활용 2: Claude Desktop에서 MCP로 연동하기

Claude Desktop의 MCP 설정에 gws를 추가하면, 대화형으로 구글 워크스페이스를 제어할 수 있습니다.

```
{\n  \"mcpServers\": {\n    \"gws\": {\n      \"command\": \"gws\",\n      \"args\": [\"mcp\"]\n    }\n  }\n}\n
```

이렇게 설정하면 Claude에게 다음과 같은 요청이 가능해집니다:

- \\"오늘 받은 메일 중 중요한 것 요약해줘\\"
- \\"내일 오후 3시에 팀 미팅 잡아줘\\"
- \\"Drive에서 최근 수정한 파일 5개 찾아줘\\"
- \\"이번 주 일정 정리해줘\\"

### 활용 3: 스크립트로 워크스페이스 자동화하기

gws는 JSON 응답을 지원하기 때문에, 셸 스크립트나 자동화 파이프라인에 자연스럽게 끼워 넣을 수 있습니다.

```
# Sheets 데이터를 JSON으로 가져와서 가공\ngws sheets spreadsheets.values get \\\n  --spreadsheet-id \"YOUR_SHEET_ID\" \\\n  --range \"Sheet1!A1:D10\" \\\n  --output json\n\n# 파일 목록 추출 후 처리\ngws drive files list --output json | jq '.files[].name'\n
```

*Photo by* [*Rohan*](https://unsplash.com/@rohanphoto) *on* [*Unsplash*](https://unsplash.com/)

## 요금 & 시작하기

- **완전 무료**: 오픈소스 프로젝트 (GitHub에서 확인 가능)
- **요구사항**: Node.js 환경, 구글 계정
- **인증**: OAuth 방식 (첫 실행 시 브라우저로 인증)
- **주의**: 아직 v1.0 이전으로 Breaking Change가 있을 수 있습니다

설치는 한 줄이면 됩니다:

```
sudo npm install -g @googleworkspace/cli
```
