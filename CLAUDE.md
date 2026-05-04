
## 컴팩션 시 보존 지시

컴팩션 발동 시 반드시 보존:
1. 현재 작업 중인 태스크 설명
2. 수정된 파일 전체 목록
3. 아직 해결 안 된 에러 메시지
4. 하드 제약: "마이그레이션 파일 수정 금지", "게스트 데이터 Firestore 저장 금지"

## 브라우저 스모크 (자동화)

리팩토링·탭 분할·스크립트 변경 후 수동 확인 요청 대신 **Playwright MCP로 직접 실행**한다.

### 실행 규약
1. 스모크 필요 시 사용자에게 "확인 부탁합니다" 대신 `browser_navigate` → `browser_snapshot`/`browser_take_screenshot` 로 시작
2. 로컬 HTTP 서버가 필요하면 Astro dev server로 실행 후 테스트 (`pnpm --filter @snuhmate/web dev`)
3. 각 탭 전환 후 `browser_console_messages` 로 에러 0건 확인
4. 완료 후 `browser_close`로 브라우저 종료
5. 스크린샷은 /tmp 에 저장 → 필요 시 사용자에게 경로 제공

### 필수 체크리스트 (Plan A/B/C 공통)
- 홈 탭 요약 카드
- 급여 탭 3개 서브탭 (계산/명세서/퇴직금)
- 시간외 탭 시급 경고 배너 동작
- 휴가 탭 연차 계산
- 찾아보기 탭
- 개인정보 탭 프로필 저장/불러오기
- 설정 탭 AppLock 토스트
- 피드백 탭
- 콘솔 에러 0건

### 권한 설정
모든 `mcp__plugin_playwright_playwright__browser_*` 도구는 `.claude/settings.local.json` 에서 승인 없이 실행됨.

### 알려진 제약 — Playwright MCP + 로컬호스트
이전 MCP 설정(기본 bundled Chromium)에서 `localhost`/LAN IP로 바인딩된 로컬 서버의 subresource 로드가 `ERR_EMPTY_RESPONSE` 발생. curl은 정상 200 응답.
**해결책 적용 완료** (`~/.claude/plugins/cache/claude-plugins-official/playwright/unknown/.mcp.json` 및 marketplaces 원본):
```json
"args": ["@playwright/mcp@latest", "--browser", "chrome", "--allowed-origins", "*"]
```
시스템 Chrome + allowed-origins 와일드카드로 전환. **Claude Code 재시작 필요** (MCP 서버 재초기화).

재시작 전에는 수동 스모크 (사용자가 개인 Chrome으로 열람)로 폴백.

## 자체 검증 루프

수정 후 "완료"라고 말하기 전에 변경 범위에 맞는 검증을 직접 실행한다.

### 기본 명령
- `pnpm lint` — ESLint. 브라우저 전역, 모듈 경계, accidental undefined 확인.
- `pnpm check` — `apps/web` Astro/TypeScript check.
- `pnpm test:unit` — 계산기, 파서, 순수 로직 Vitest.
- `pnpm test:integration` — Firebase sync, CSP, build, data lifecycle, 브라우저형 계약.
- `pnpm test:smoke` — Playwright. `playwright.config.js`의 Astro dev server 사용.
- `pnpm verify:data` — 단협/호봉표 drift 확인.
- `pnpm verify` — lint + check + 전체 테스트 + build.

### 변경 유형별 최소 검증
- 계산/급여/퇴직금/공휴일/파서 변경: `pnpm test:unit`
- Firebase Auth, Firestore, localStorage, hydrate/write-through 변경: `pnpm test:integration`
- Astro page, CSS, 탭, 브라우저 UI 변경: `pnpm check && pnpm build && pnpm test:smoke`
- 규정/호봉표/public data/generated mirror 변경: `pnpm verify:data`
- `backend/` FastAPI 변경: `pnpm backend:test`

UI 변경은 유닛 테스트만으로 끝내지 않는다. Playwright MCP 또는 Codex in-app browser로
`http://localhost:4321/app`을 열고, 변경된 route/control을 실제로 클릭한 뒤 콘솔 에러 0건을 확인한다.
이 repo는 Astro route가 기준이므로 `python3 -m http.server`로 대체하지 않는다.

명령이 실패하면 실패 원인을 수정하고 같은 명령을 다시 실행한다. 실패를 알고도 완료라고 보고하지 않는다.

## 코드 인텔리전스

Claude Code에서는 다음 플러그인을 기본값으로 사용한다.

```text
/plugin install typescript-lsp@claude-plugins-official
/plugin install pyright-lsp@claude-plugins-official
```

로컬 바이너리도 필요하다.

```bash
npm install -g typescript-language-server typescript pyright
```

TypeScript/JavaScript/Astro 쪽은 `typescript-language-server`, `backend/` Python 쪽은 `pyright`를
사용한다. Rust/Go/C#/Java 계열 LSP는 현재 repo 런타임이 아니므로 기본 설치 대상에서 제외한다.

## CLI 우선 원칙

GitHub/JSON/검색 작업은 가능한 한 CLI를 먼저 쓴다. MCP 서버보다 컨텍스트 비용이 작고,
실패 지점도 명확하다.

```bash
gh pr view --json statusCheckRollup,reviews,comments | jq .
gh pr checks
gh issue list --json number,title,state,labels | jq .
rg "검색어"
```

처음 보는 CLI는 `<tool> --help`를 읽고, 가장 작은 read-only 명령부터 실행한다.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

### SNUHmate 전용 smate-* 라우팅

| 트리거 표현 | 스킬 |
|-----------|------|
| UI/CSS/Astro 바꿨어, 디자인시스템 점검, 토큰 확인 | `smate-design-guard` |
| 계산기·단협·파서·호봉표 바꿨어, 급여 회귀 검토 | `smate-payroll-review` |
| 커밋푸쉬머지, ship it, PR 올려줘 | `smate-pr-ops` |
| B6 마스킹, 마스킹 서비스, PII 파이프라인 | `smate-b6-masking` |
| 새 기능 끝까지, 이 기능 출시까지, 한 사이클 돌려줘 | `smate-feature-ship` |

## 하네스: SNUHmate

**목표:** SNUH 의료진의 초과근무·급여·퇴직금을 정확하게 계산·안내하는 앱 SNUHmate의 개발·검증·배포 워크플로우 자동화

**트리거:** 위 smate-* 라우팅 표를 참조. 복합 작업(신규 기능 전체 사이클)은 `smate-feature-ship` 스킬을 사용.

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-05-01 | 초기 구성 완료 | 전체 (6 agents, 6 skills) | SNUHmate 도메인 전용 하네스 |
| 2026-05-04 | CLAUDE.md 하네스 포인터 등록 | CLAUDE.md | harness 스킬 규격 준수 |
