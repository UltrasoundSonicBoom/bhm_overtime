---
name: smate-b6-masking
description: "SNUHmate B6 — 사용자가 CSV·Excel·PDF·이미지를 올리면 한국 PII 를 마스킹한 안전 파일을 받는 서비스의 *구현 워크플로우*. 백엔드 정규식+NER+Presidio 파이프라인 + 도구 탭 UI 의 빌드·검토·확장 시 호출. 'B6 마스킹 작업', '마스킹 서비스 만들어줘', '마스킹 파이프라인 검토' 등에 사용."
---

# SNUHmate B6 Masking — 마스킹 서비스 구현 워크플로우

병원 직원이 매일 다루는 자료(환자 정보 섞인 CSV·Excel·PDF·사진)를 SNUHmate 가 마스킹해서 돌려주는 서비스. 처음 출시 후에도 새 PII 형식·새 파일 포맷 추가 시 같은 워크플로우 재호출.

## 언제 사용

- B6 마스킹 서비스 첫 구현
- 새 PII 형식 추가 (예: 환자번호 새 포맷, 새 카드번호 패턴)
- 새 파일 형식 지원 추가 (예: HWP, PPTX)
- 마스킹 정확도 회귀 발생 시
- 외부 LLM 옵트인 활성화·비활성화

## 에이전트 구성

| 에이전트          | 파일                                  | 역할                                             |
| ----------------- | ------------------------------------- | ------------------------------------------------ |
| smate-pii-masker  | `.claude/agents/smate-pii-masker.md`  | 백엔드 마스킹 모듈 구현·디버깅                   |
| smate-ds-guard    | `.claude/agents/smate-ds-guard.md`    | "도구" 탭 UI 의 디자인시스템 정합 점검 (변경 시) |
| smate-pr-reviewer | `.claude/agents/smate-pr-reviewer.md` | 머지 직전 보안·CHANGELOG 게이트 (PR 단계)        |

## 참조 도메인 지식 (필수 import)

- `.claude/skills/smate-pii-patterns/skill.md` — 정규식 카탈로그·NER 룰·토큰 명세·LLM 검증 전략. 모든 구현은 이 문서를 ground truth 로 참조.

## 워크플로우

### Phase 1: 입력 정리 (오케스트레이터)

1. 사용자에게 한 줄 확인:
   - **변경 의도** (예: "환자번호 새 형식 추가", "PDF 출력 포맷 보존 v2")
   - **영향 영역** (백엔드 정규식만? UI까지? OCR 의존성?)
2. 현재 상태 인벤토리:

```bash
ls backend/app/masking/ 2>/dev/null
ls backend/tests/masking/fixtures/ 2>/dev/null
grep -E "/api/mask" backend/app/main.py 2>/dev/null
ls apps/web/public/tabs/tab-tools.html 2>/dev/null
```

3. `_workspace/b6_input.md` 정리.

### Phase 2: 페르소나·UI 위치 게이트 (첫 출시 시만)

첫 구현이면:

- 페르소나 매트릭스(`docs/harness/persona-matrix.md`) 의 B6 행이 채워졌는지 확인. 비어있으면 사용자에게 인터뷰 요청 후 채움
- UI 위치 결정 (도구 탭 / 개인정보 하위 / 찾아보기 하위) — `@smate-ds-guard` 호출

후속 작업이면 이 Phase skip.

### Phase 3: 백엔드 구현 (smate-pii-masker dispatch)

`@smate-pii-masker` 에 다음 메시지:

> 다음 변경을 백엔드 마스킹 모듈에 적용:
>
> - 의도: \<한 줄\>
> - 영향 모듈: \<regex_masker / ner_masker / llm_verifier / file_handler / pipeline / router 중\>
>   TDD 원칙 — 실패 테스트 먼저, 구현, 통과 확인.
>   `smate-pii-patterns` 스킬을 ground truth 로 import.

산출물 보고를 받은 후:

```bash
cd backend && poetry run pytest tests/masking/ -v
```

통과 확인.

### Phase 4: 프런트엔드 변경 (필요 시)

UI 변경이 있다면:

- `apps/web/public/tabs/tab-tools.html`, `apps/web/src/client/masking-panel.js` 수정
- **HTML 직접 주입 금지** — `textContent` + DOM 구성만 (XSS 방지). 사용자 입력·서버 응답을 HTML 문자열로 DOM 에 넣지 않는다.
- `@smate-ds-guard` 호출해 토큰·인라인 룰 검증

### Phase 5: E2E 검증

1. 백엔드 + dev 서버 동시 실행:

```bash
cd backend && poetry run uvicorn app.main:app --port 8000 &
pnpm --filter @snuhmate/web dev &
sleep 5
```

2. Playwright 또는 수동:

```bash
pnpm test:smoke -- tests/e2e/masking.spec.js 2>&1 | tee _workspace/b6_e2e.log
```

3. fixture 5종 회귀:

```bash
cd backend && poetry run pytest tests/masking/test_e2e_samples.py -v
```

### Phase 6: PR 게이트 (`smate-pr-ops` 에 위임)

`/smate-pr-ops` 호출. 변경 의도: "B6 마스킹 \<영역\>". 리뷰어 게이트 → ship-it 자동 머지.

## 통과 조건

- `backend/tests/masking/` 전체 통과
- E2E 시나리오 통과 (CSV → 마스킹 → 다운로드)
- fixture 5종 회귀 0건
- UI 변경 시 디자인시스템 가드 🟢
- PR 리뷰 🔴 0건
- 머지 완료

## 보안 가드 (이 워크플로우 전체에 적용)

- **원본 PII 외부 송신 0** — Presidio 기본, 외부 LLM 옵트인 시에도 _마스킹된 텍스트만_ 송신
- **서버 디스크 미저장** — 업로드 파일은 메모리에서 처리 후 즉시 폐기
- **감사 로그는 카테고리×개수만** — PII 본문 절대 비저장
- **프런트엔드 textContent only** — HTML 직접 주입 API 금지 (`smate-pr-reviewer` 보안 표 참조)

## 에러 핸들링

- **fixture 깨짐 (false negative)** → `@smate-pii-masker` 에 재호출, 정규식·NER 룰 추가
- **fixture 깨짐 (false positive — 정상 데이터를 PII로 잡음)** → 룰 좁힘, 컨텍스트 추가
- **외부 OCR/spaCy 의존성 누락** → 폴백으로 동작하되 사용자에게 README 안내
- **20MB 초과 업로드** → 백엔드 413, 프런트 사전 차단

## 참조

- 도메인 지식: `.claude/skills/smate-pii-patterns/skill.md`
- 에이전트: `.claude/agents/smate-pii-masker.md`
- B 카탈로그: `docs/harness/b-catalog.md` (B6 행)
