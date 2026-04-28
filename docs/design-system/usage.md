# SNUH Mate Design System — Usage Guide

> 새 페이지·기능을 만들 때 참고하세요. 라이브 쇼케이스: `/design-system`

## 핵심 원칙

새 페이지·기능에서 임의 디자인을 만들지 않는다. 정해진 토큰·컴포넌트·패턴만 조합한다.

## 새 페이지 체크리스트

### 토큰
- [ ] 색상은 `--color-*` 토큰만 사용했는가? (raw hex 금지)
- [ ] 폰트 크기는 `text-ds-*` 유틸 또는 `--font-size-*` 만 사용했는가?
- [ ] 간격은 `--space-*` (4px 그리드) 만 사용했는가?
- [ ] radius / shadow 는 토큰을 사용했는가?

### 컴포넌트
- [ ] 버튼은 `<Button />` 컴포넌트인가?
- [ ] 입력은 `<FormField>` + `<Input/Select/Textarea>` 조합인가?
- [ ] 카드/박스는 `<Card />` 컴포넌트인가?
- [ ] 모달은 `<Modal />` 컴포넌트인가?
- [ ] 탭은 `<Tabs />` 컴포넌트인가?

### 패턴
- [ ] 페이지에 `<PageHeader />` 가 있는가?
- [ ] 빈 상태에 `<EmptyState />` 가 있는가?
- [ ] 로딩 중 `<LoadingSkeleton />` 또는 `aria-busy` 가 있는가?
- [ ] 오류 상태에 `<ErrorState />` 가 있는가?

### 접근성
- [ ] 키보드 조작 가능한가?
- [ ] focus 링이 보이는가?
- [ ] 폼 필드에 `<label>` 이 연결되었는가?
- [ ] 아이콘만 있는 버튼에 `aria-label` 이 있는가?
- [ ] 색상 대비 WCAG AA 이상인가?
- [ ] 다크 모드에서도 정상인가?

### 거버넌스
- [ ] inline `style="..."` 안 raw 값을 사용하지 않았는가?
- [ ] 새 컴포넌트가 필요하면 `components/ui/` 또는 `components/patterns/` 에 추가하고 `/design-system` 쇼케이스에 등록했는가?

## 컴포넌트 선택 트리

```
사용자 액션이 필요하다 → Button
사용자 입력이 필요하다 → FormField + Input/Select/Textarea/Checkbox/Radio/Switch
정보 그룹화가 필요하다 → Card
짧은 라벨이 필요하다 → Badge
사용자 안내가 필요하다 → Alert
모달/확인 대화가 필요하다 → Modal
탭 전환이 필요하다 → Tabs
페이지 헤더 → PageHeader
빈 상태 → EmptyState
폼 그룹 → FormSection
로딩 중 → LoadingSkeleton
오류 화면 → ErrorState
```

## Import 경로

상대 경로로 import:

```js
import Button from '../../components/ui/Button.astro';
import Card from '../../components/ui/Card.astro';
import PageHeader from '../../components/patterns/PageHeader.astro';
import Container from '../../components/layout/Container.astro';
```

(경로는 사용 중인 페이지 위치에 따라 조정.)
