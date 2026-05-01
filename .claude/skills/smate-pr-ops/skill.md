---
name: smate-pr-ops
description: "SNUHmate PR 운영 자동화 — 리뷰·CHANGELOG·커밋·푸시·PR 생성·머지를 한 번에. '커밋푸쉬머지', 'ship it', '끝났어 한 번에 올려줘', 'PR 만들어 머지까지', '브랜치 정리해서 main에 올려줘' 같은 머지 단계 요청에 사용. 단, 변경 의도가 모호하거나 spec/plan 누락 변경이 다수면 사용자 확인 후 진행."
---

# SNUHmate PR Ops — 머지까지 한 번에

작업 완료 후 깃 작업 5단계(`add → commit → push → PR → merge`)를 두 에이전트 협업으로 수행한다. 리뷰어가 GO 시그널을 줄 때만 ship-it 이 머지로 진행.

## 언제 사용

- 사용자가 작업 마무리하며 "이거 한 번에 올려줘 / 머지까지" 요청
- 한 PR 단위 작업이 끝났을 때
- CHANGELOG·spec drift·메모리 룰 위반을 자동 점검하고 머지하고 싶을 때

## 에이전트 구성

| 에이전트          | 파일                                  | 역할                                                  |
| ----------------- | ------------------------------------- | ----------------------------------------------------- |
| smate-pr-reviewer | `.claude/agents/smate-pr-reviewer.md` | diff 분석·spec drift·보안·회귀·CHANGELOG 점검         |
| smate-ship-it     | `.claude/agents/smate-ship-it.md`     | 의도된 파일 add → commit → push → PR → CI 대기 → 머지 |

## 워크플로우

### Phase 1: 입력 정리 (오케스트레이터)

1. 사용자에게 한 줄 확인:
   - **변경 의도** (예: "smate harness 6개 + ship-it 에이전트 추가")
   - **PR 제목 후보** (없으면 의도에서 자동 생성)
   - **머지 정책** (기본 squash, `merge`/`rebase` 명시 시 변경)
   - **base 브랜치** (기본 `main`)
2. `_workspace/pr_input.md` 에 정리.
3. 워킹트리 인벤토리:

```bash
git status --short
git diff --stat origin/main..HEAD
git log --oneline origin/main..HEAD
```

베이스라인 검증:

```bash
pnpm lint && pnpm check
```

실패 시 사용자에게 "린트·타입 실패 — 수정 후 재시도" 보고.

### Phase 2: 리뷰 (smate-pr-reviewer dispatch)

`@smate-pr-reviewer` 에 다음 메시지로 호출:

> 다음 PR 의 리뷰를 수행해 `_workspace/pr_review.md` 로 저장:
>
> - base: \<base\>
> - branch: \<current\>
> - 변경 의도: \<한 줄\>
>   산출물 포맷은 너의 system prompt 의 "산출물 포맷" 섹션 참조.

리뷰 결과를 본 후:

- 🔴 **0건** → Phase 3 진행
- 🔴 **≥1건** → 사용자에게 보고 + STOP. 사용자가 수정 후 재호출 또는 "🔴 항목 무시하고 진행" 명시 답변 필요.
- 🟡 **≥1건** → 사용자에게 1줄로 보여주고 "넘어가도 돼?" 확인.

### Phase 3: CHANGELOG 자동 갱신 (필요 시)

리뷰가 "CHANGELOG 누락" 짚으면:

1. 변경 영역에 따라 한 항목 작성 (예: `### Added`, `### Fixed`, `### Changed`, `### Removed`).
2. `apps/web/public/CHANGELOG.md` 와 `public/CHANGELOG.md` 양쪽에 동일 항목 추가.
3. 사용자 승인 후 staged.

### Phase 4: ship-it (smate-ship-it dispatch)

`@smate-ship-it` 에 다음 메시지:

> 다음 변경을 한 번에 올려줘:
>
> - 의도: \<한 줄\>
> - PR 제목: \<제목\>
> - 머지 정책: squash
> - base: \<base\>
>   리뷰 GO 시그널 받음 (`_workspace/pr_review.md` 의 🔴 0건). 부수 변경 unstage 룰 준수.

ship-it 이 PR URL 과 머지 결과를 보고.

### Phase 5: 마무리 (오케스트레이터)

1. 머지 완료 시 main 동기화 안내:

```bash
git switch main && git pull --ff-only
```

2. (선택) 워크트리 정리 안내 — 자동 실행 안 함:

```bash
# 사용자 판단:
git worktree remove <worktree-path>
git branch -d <branch>
```

3. `_workspace/pr_summary.md` 작성: PR URL, 머지 시각, 다음 단계 제안.

## 통과 조건

- `_workspace/pr_input.md`, `pr_review.md`, `pr_summary.md` 모두 존재
- 리뷰 🔴 0건 (또는 사용자 명시 무시)
- 머지 완료 _또는_ CI 대기 상태로 사용자 보고 (실패 시 머지 안 함)

## 에러 핸들링

- **CI 실패** → 머지 안 함. `gh pr checks` 출력 그대로 보고
- **충돌** → ship-it 이 자동 rebase 시도, 충돌 잔존 시 사용자에게 보고
- **권한 부족** → "사용자가 직접 머지 필요" 보고
- **워킹트리 더러움 (formatter 잔재 100+ 파일)** → 의도된 파일만 add 됐는지 한 번 더 사용자 확인 후 진행
- **PR 이미 존재** → push 만 하고 기존 PR 자동 갱신, 새 PR 생성 안 함

## 참조

- `@smate-pr-reviewer.md`, `@smate-ship-it.md`
- CLAUDE.md 의 "CLI 우선 원칙" — `gh`, `jq`, `rg` 적극 활용
