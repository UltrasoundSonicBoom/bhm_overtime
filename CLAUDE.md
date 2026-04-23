
## 브라우저 스모크 (자동화)

리팩토링·탭 분할·스크립트 변경 후 수동 확인 요청 대신 **Playwright MCP로 직접 실행**한다.

### 실행 규약
1. 스모크 필요 시 사용자에게 "확인 부탁합니다" 대신 `browser_navigate` → `browser_snapshot`/`browser_take_screenshot` 로 시작
2. 로컬 HTTP 서버가 필요하면 background로 실행 후 테스트 (`python3 -m http.server 8080 &`)
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
모든 `mcp__plugin_playwright_playwright__browser_*` 도구는 `.claude/settings.local.json` 에서 승인 없이 실행됨 (프롬프트 발생 시 설정 누락으로 간주하고 `/agent-skills:update-config` 참고).

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
