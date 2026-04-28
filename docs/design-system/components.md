# SNUH Mate Design System — Components

각 컴포넌트는 `/design-system/components` 라이브 쇼케이스에서 확인하세요.

## UI Primitives (13)

| 컴포넌트 | Variant | Size | 사용 시점 |
|---|---|---|---|
| Button | primary / secondary / tertiary / danger / ghost | sm / md / lg | 사용자 액션 트리거 |
| Badge | neutral / info / success / warning / error | sm / md | 상태 라벨 |
| Input | text / email / tel / number / date / password | (md) | 단일 줄 입력 |
| Select | — | (md) | 드롭다운 선택 |
| Textarea | — | (rows) | 다중 줄 입력 |
| Checkbox | — | — | 다중 선택 |
| Radio | — | — | 단일 선택 (그룹) |
| Switch | — | — | on/off 토글 |
| FormField | — | — | label + helper + error wrapper |
| Card | — | none / sm / md / lg padding | 콘텐츠 그룹 |
| Alert | info / success / warning / error | — | 사용자 안내 |
| Modal | — | sm / md / lg | 모달 / 확인 대화 |
| Tabs | top / sub | — | 탭 전환 |

## Layout (5)

| 컴포넌트 | 용도 |
|---|---|
| Container | 페이지 콘텐츠 폭 (sm/md/lg/full) |
| Stack | flex row/column + gap |
| Section | 헤딩 + 본문 그룹 |
| Grid | 균등 그리드 |
| Divider | 가로/세로 구분선 |

## Patterns (5)

| 패턴 | 용도 |
|---|---|
| PageHeader | 페이지 제목 + 설명 + actions |
| EmptyState | 데이터 없음 안내 |
| FormSection | 폼 필드 그룹 (collapsible 옵션) |
| LoadingSkeleton | 로딩 중 placeholder |
| ErrorState | 오류 안내 + 재시도 |

## 사용 금지

- raw `<button>` 직접 사용 금지 — `<Button />` 사용.
- `style="color: ..."` 직접 색 지정 금지 — token 사용.
- `padding: 13px` 같은 임의 값 금지 — spacing scale 사용.
- 새로운 모달/카드 스타일을 별도로 만들지 말 것 — 기존 컴포넌트 확장.
