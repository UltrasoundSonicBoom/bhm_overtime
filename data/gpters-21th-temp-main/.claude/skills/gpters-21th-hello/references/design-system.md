# GPTers 21th Hello — Design System (B5 White Clean)

## Font

```
Google Fonts CDN:
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;900&display=swap" rel="stylesheet">

font-family: 'Noto Sans KR', sans-serif;
```

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#EB5A10` | CTA, 강조, 스트라이프, 태그, 스텝 넘버, 섹션 좌측 바 |
| `--black` | `#000000` | 커버 제목 (최대 대비) |
| `--title` | `#111111` | 섹션 제목, 카드 제목, info value |
| `--text` | `#333333` | 본문, step text |
| `--text-light` | `#555555` | case description |
| `--text-muted` | `#666666` | subtitle |
| `--label` | `#999999` | page header, date |
| `--footer` | `#CCCCCC` | page footer |
| `--role` | `#888888` | profile role, next-card desc |
| `--bg-page` | `#FFFFFF` | 페이지 배경 |
| `--bg-body` | `#F0F0F0` | 페이지 사이 배경 |
| `--bg-card` | `#FFFFFF` | 카드 배경 |
| `--bg-info` | `#F9F9F9` | info item 배경 |
| `--bg-tech` | `#F5F5F5` | tech tag 배경 |
| `--bg-highlight` | `#FFF5F0` | 하이라이트 박스 배경 |
| `--border` | `#F0F0F0` | 카드 border (2px solid) |

## Typography Scale

| Element | Size | Weight | Extra |
|---------|------|--------|-------|
| Cover h1 | 64px | 900 | letter-spacing: -2px, line-height: 1.2 |
| Cover label | 16px | 700 | uppercase, letter-spacing: 6px |
| Cover subtitle | 22px | 400 | line-height: 1.7 |
| Cover badge | 14px | 700 | outline style (border 2px) |
| Section title | 36px | 900 | letter-spacing: -1px, **left border 4px #EB5A10 + padding-left 16px** |
| Profile name | 28px | 700 | |
| Case title | 20px | 700 | |
| Info value | 20px | 700 | |
| Intro text | 18px | 400 | line-height: 1.8, color: #333 |
| Body / step text | 17-18px | 400 | line-height: 1.7-1.9 |
| Highlight text | 17px | 400 | line-height: 1.8 |
| Tag | 15px | 600 | |
| Tech tag | 14px | 700 | |
| Info label | 13px | 600 | uppercase, letter-spacing: 1px, **color: #EB5A10** |
| Page header | 13px | 600 | uppercase, letter-spacing: 2px |
| Page footer | 13px | 400 | letter-spacing: 1px |

## Components

### Page Container

```css
.page {
  width: 880px;
  min-height: 1100px;
  margin: 40px auto;
  background: #FFFFFF;
  padding: 64px 56px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.08);
}
```

### Page Header

```css
border-top: 3px solid #EB5A10;
padding-top: 12px;
/* LEFT: section name (uppercase) | RIGHT: page number */
```

### Page Footer

```css
position: absolute; bottom: 32px;
text-align: center;
color: #CCCCCC;
content: "GPTers 21기 Claude Code 스터디"
```

### Cover

- 왼쪽 스트라이프: `width: 6px; background: #EB5A10` (full height)
- 내부 padding: `64px 56px 64px 80px` (스트라이프 여백)
- Badge: **outline 스타일** — `border: 2px solid #EB5A10; background: transparent; color: #EB5A10`

### Section Title

```css
font-size: 36px; font-weight: 900;
border-left: 4px solid #EB5A10;
padding-left: 16px;
```
**핵심 특징:** 왼쪽 오렌지 바 — B5의 아이덴티티

### Card (profile, case, next)

```css
background: #FFFFFF;
border: 2px solid #F0F0F0;
border-radius: 16px;
padding: 32-40px;
box-shadow: 0 1px 3px rgba(0,0,0,0.04);
```

### Next Card (CTA 카드)

```css
/* 기본 card 스타일 + */
border-top: 3px solid #EB5A10;  /* 오렌지 탑 바 */
text-align: center;
```

### Avatar

```css
width: 88px; height: 88px;
border-radius: 50%;
background: #EB5A10;  /* solid, no gradient */
color: #fff; font-size: 36px; font-weight: 900;
```

### Tag (인물/관심사)

```css
background: #EB5A10;  /* bold orange pill */
color: #FFFFFF;
padding: 6px 16px;
border-radius: 20px;
font-weight: 600;
```

### Tech Tag (기술 스택)

```css
background: #F5F5F5;
color: #333;
font-weight: 700;
border-radius: 6px;
padding: 5px 14px;
```

### Highlight Box

```css
border-left: 6px solid #EB5A10;  /* 두꺼운 오렌지 바 */
background: #FFF5F0;
padding: 24px 28px;
border-radius: 0 8px 8px 0;
```

### Step Number

```css
width: 40px; height: 40px;
border-radius: 50%;
background: #EB5A10;
color: #fff;
font-size: 18px; font-weight: 700;
```

### Info Item

```css
background: #F9F9F9;
border: none;
border-radius: 12px;
padding: 20px 24px;
/* label: #EB5A10 (orange!), value: #111 */
```

## Design Principles

1. **White Clean**: 순백 배경, 그림자 최소화, 깨끗한 구조
2. **Bold Orange Accents**: 오렌지는 강렬하게 — 태그/스텝/섹션바/헤더에 집중
3. **Magazine Typography**: 64px 커버, 36px 섹션, 큰 글씨로 임팩트
4. **Info Label = Orange**: 라벨을 오렌지로 처리해 시각적 계층 강화
5. **Outline Badge**: 커버 뱃지만 아웃라인 스타일 (나머지 태그는 solid)
6. **Orange Top Bar on CTA Cards**: next-card에 오렌지 탑 바로 행동 유도
7. **Section Left Bar**: 모든 섹션 제목에 `border-left: 4px #EB5A10` — B5 시그니처

### TOC (Table of Contents)

| Element | CSS |
|---------|-----|
| `.toc-section-label` | `font-size: 12px; font-weight: 600; color: #EB5A10; uppercase; letter-spacing: 1px; border-top: 1px solid #F0F0F0` |
| `.toc-row` | `display: flex; align-items: center; padding: 5px 0` |
| `.toc-num` | `width: 32px; height: 32px; border-radius: 50%; background: #EB5A10; color: #fff; font-size: 15px; font-weight: 700; margin-right: 16px` |
| `.toc-title` | `font-size: 17px; font-weight: 700; color: #111; flex: 1` |
| `.toc-page` | `font-size: 15px; color: #999; font-weight: 600; margin-left: 16px` |

### Feature Card (소개 카드)

| Element | CSS |
|---------|-----|
| `.feature-card` | Card base + `display: flex; align-items: flex-start; gap: 24px` |
| `.feature-icon` | `font-size: 36px; flex-shrink: 0; line-height: 1` |
| `.feature-title` | `font-size: 20px; font-weight: 700; color: #111` |
| `.feature-desc` | `font-size: 16px; color: #555; line-height: 1.7` |

### Case Card (사례 카드)

| Element | CSS |
|---------|-----|
| `.case-card` | Card base + `padding: 32px; margin-bottom: 32px` |
| `.case-title` | `font-size: 20px; font-weight: 700; color: #111` |
| `.case-desc` | `color: #555; margin-bottom: 20px` |
| `.steps` > `.step` | `display: flex; align-items: flex-start; gap: 20px; margin-bottom: 20px` |
| `.step-text` | `font-size: 17px; line-height: 1.7; color: #333` |

Uses Step Number + Tech Tag + Highlight Box components.

### Tip List Item

| Element | CSS |
|---------|-----|
| `.tip-item` | `display: flex; align-items: flex-start; gap: 20px; margin-bottom: 28px` |
| `.tip-title` | `font-size: 18px; font-weight: 700; color: #111` |
| `.tip-desc` | `font-size: 16px; color: #555; line-height: 1.7` |

Uses Step Number component for numbering.

### Timeline (Roadmap)

| Element | CSS |
|---------|-----|
| `.timeline` | `position: relative; padding-left: 68px` |
| `.timeline::before` | Vertical line: `left: 19px; width: 2px; background: #F0F0F0` |
| `.timeline-num` | Step Number positioned `absolute; left: -68px; top: 28px; z-index: 1` |
| `.timeline-card` | Card base + `border-top: 3px solid #EB5A10; padding: 28px 32px` |
| `.timeline-title` | `font-size: 20px; font-weight: 700; color: #111` |
| `.timeline-assignment` | `font-size: 16px; color: #555; line-height: 1.6` |

Uses Tag component for skill badges inside cards.

### Closing (마무리)

| Element | CSS |
|---------|-----|
| `.closing-center` | `text-align: center; padding-top: 120px` |
| `.closing-small` | `font-size: 32px; font-weight: 700; color: #111` |
| `.closing-big` | `font-size: 44px; font-weight: 900; color: #EB5A10` |
| `.made-with` | Card base + `text-align: center` |
| `.next-cards` | `display: grid; grid-template-columns: 1fr 1fr; gap: 24px` |
| `.next-card` | Card base + `border-top: 3px solid #EB5A10; text-align: center` |

## Print / PDF

```css
@media print {
  body { background: #fff; }
  .page { box-shadow: none; margin: 0; page-break-after: always; }
}
```

## HTML Structure Template

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{user.name}의 Claude Code 가이드북 — GPTers 21기</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>/* B5 design system CSS here */</style>
</head>
<body>

<!-- PAGE N -->
<div class="page">
  <div class="page-header">
    <span>{SECTION_NAME}</span>
    <span>{NN}</span>
  </div>
  <!-- content -->
  <div class="page-footer">GPTers 21기 Claude Code 스터디</div>
</div>

</body>
</html>
```
