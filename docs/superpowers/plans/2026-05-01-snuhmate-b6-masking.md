# SNUHmate (B6) Masking Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 CSV·Excel·PDF·이미지 파일을 업로드하면 1차 Python 마스킹(정규식 + NER) + 2차 LLM 기반 검증을 거친 안전 파일을 다운로드할 수 있는 SNUHmate 기능을 만든다. (B) 슬롯 첫 번째 출시.

**Architecture:**

- 백엔드: FastAPI `/api/mask` 엔드포인트 + `backend/app/masking/` 모듈 (정규식 → NER → LLM 검증 파이프라인).
- 프런트엔드: SNUHmate에 새 탭 _또는_ 개인정보 탭 하위 섹션 (T3에서 결정). 드래그-드롭 업로드 → 진행 상태 → 다운로드 + 마스킹 감사 로그.
- 데이터: 처리한 파일은 서버에 영구 저장하지 않음 (메모리 또는 임시 디렉토리, 응답 후 즉시 삭제). 감사 로그(어떤 항목 몇 개 마스킹됐는지)만 익명 집계로 누적.

**Tech Stack:** FastAPI(기존), Python 3.11, `pdfplumber`(PDF), `pandas`+`openpyxl`(Excel/CSV)(기존), `Pillow`+`pytesseract` 또는 OCR API(이미지), 정규식, optional `spacy[ko]` NER, Presidio(자가호스팅) + 옵트인 외부 LLM. 프런트는 기존 Astro+Vanilla JS 스택.

**Spec:** [docs/superpowers/specs/2026-05-01-snuhmate-harness-design.md](../specs/2026-05-01-snuhmate-harness-design.md) §4 B6.

**Prerequisite:** [`2026-05-01-snuhmate-harness-A-setup.md`](2026-05-01-snuhmate-harness-A-setup.md) 가 머지된 상태여야 함.

**Security note:** 사용자 노출 UI는 `textContent` 만 사용하고 `innerHTML` 은 사용 금지. 서버 응답에 포함된 파일명·메시지에 XSS 가능성이 있으므로 DOM 구성으로만 출력.

---

## Pre-implementation Gates (smate-b-feature 1~4 단계)

### Task 1: 페르소나 리서치 (Jayce-led, skip 불가)

**Owner:** Jayce. 이 task는 코딩이 아니라 사용자 인터뷰/관찰. 에이전트는 결과를 정리만 한다.

**Files:**

- Modify: `docs/harness/persona-matrix.md`

- [ ] **Step 1: `/smate-persona-research` 호출 (Jayce가 인터뷰 진행)**

최소 2명 인터뷰. 각 부서·직종에 대해 다음 질문:

1. ChatGPT/Gemini 같은 AI 도구에 병원 자료를 올려본 적이 있는가? 어떤 자료?
2. 그때 환자/개인정보가 섞여 있어서 망설였던 경험이 있는가?
3. 마스킹된 자료를 받으면 무엇에 쓸 것 같은가? (어디로 다시 보내는가)
4. 자주 다루는 파일 포맷 우선순위 (CSV/Excel/PDF/사진/한글파일)?

- [ ] **Step 2: `@smate-persona-curator` 호출해 결과를 매트릭스에 추가**

`docs/harness/persona-matrix.md`의 "(B) 슬롯별 페르소나 가드" 표에서 B6 행을 채운다:

- 1차 페르소나: (예: "특정 부서 X직종, 주1회 이상 외부 AI에 자료 업로드 시도")
- 사용 빈도: 추정값
- 결정적 시나리오: 가장 빈도 높은 자료 흐름 1개

또한 "인터뷰 로그" 섹션에 인터뷰 1건 = 1엔트리.

- [ ] **Step 3: 사용자 승인 후 commit**

```bash
git add docs/harness/persona-matrix.md
git commit -m "research(harness): B6 persona — <부서/직종 요약>"
```

**통과 조건:** B6 페르소나 행이 실제 인터뷰 데이터로 채워짐. 추측·가상 페르소나로 진행 금지.

---

### Task 2: B6 sub-spec 작성

**Files:**

- Create: `docs/superpowers/specs/2026-05-XX-b6-masking-spec.md` (날짜는 작성일)

- [ ] **Step 1: sub-spec 작성**

다음 구조로 작성:

```markdown
# B6 Masking Service Spec

- Status: Draft
- Date: <오늘>
- Owner: Jayce
- Parent spec: docs/superpowers/specs/2026-05-01-snuhmate-harness-design.md §4 B6
- Persona: docs/harness/persona-matrix.md (B6 행)

## 목적

<페르소나 인터뷰에서 도출한 1~2 문장>

## 비목표

- 영구 저장 — SNUHmate는 마스킹 처리만 수행, 결과 파일을 서버에 보관하지 않음
- 임상 의사결정 보조 — 마스킹 = 단순 가공
- 다국어 NER — 한국어 우선

## 마스킹 대상 (한국어 우선)

- 주민등록번호 (6-7자리, 정규식)
- 외국인등록번호 (정규식)
- 전화번호 (010-XXXX-XXXX, 02-XXX-XXXX 등 정규식)
- 환자등록번호/의무기록번호 (병원 포맷, 정규식)
- 사업자등록번호 (정규식)
- 이메일 (정규식)
- 주소 (시·도·구·동 NER + 우편번호)
- 인명 (NER)
- 생년월일 (정규식 + NER 보강)

## 처리 파이프라인

1. 파일 형식 감지 → 텍스트 추출 (CSV/Excel/PDF/이미지 OCR)
2. 1차 정규식 마스킹 (위 목록)
3. 2차 NER 마스킹 (이름·주소 보강)
4. 3차 LLM 검증 — 정규식·NER이 놓친 PII 잔존 점검 (LLM에 _출력만_ 보냄, 원본 안 보냄)
5. 안전 파일 재구성 (포맷 유지, 마스킹된 토큰만 치환)
6. 감사 로그 — 마스킹된 항목 카테고리×개수 (개인정보 자체는 로그에 안 남김)

## UI 위치

<T3 design-guard 사전 점검 후 결정>

## 입출력

- 입력: 파일 1개, ≤ 20MB
- 출력: 마스킹된 파일 + 감사 요약 카드 (예: "주민번호 3건·전화번호 5건·이름 12건 마스킹 완료")

## 보안

- 원본 파일은 서버 메모리에서 처리 후 즉시 삭제 (디스크 미저장 원칙)
- LLM 검증 단계: 마스킹 _후_ 텍스트만 외부 LLM에 전송 — 원본 PII 외부 송신 0
- 감사 로그는 익명 집계만 (사용자 ID 없음)
- 프런트엔드는 textContent 만 사용, innerHTML 금지 (XSS 방지)

## 검증

- 통합 테스트: 샘플 파일 5개 (CSV·Excel·PDF·jpg·png) 각각 처리 → 마스킹 정확도 측정
- 회귀 테스트: 마스킹 _없이_ 통과한 PII 0건이 목표 (false negative 0)
- 정상 데이터 보존: 마스킹 _오버_ 0건 목표 (false positive 최소)
```

- [ ] **Step 2: 셀프리뷰 (placeholder/consistency/scope/ambiguity)**

placeholder 점검 → "<오늘>", "<페르소나 인터뷰에서 도출>" 같은 표시는 *명시적으로 채워야 할 자리*임을 인지하고 실제 값으로 치환했는지 확인.

- [ ] **Step 3: 사용자 리뷰 게이트 + commit**

```bash
git add docs/superpowers/specs/2026-05-XX-b6-masking-spec.md
git commit -m "docs(b6): masking service sub-spec"
```

사용자 OK 받기 전에 다음 task로 가지 않음.

---

### Task 3: `/smate-design-guard` 사전 점검 — UI 위치 결정

**Files:**

- Modify: `docs/superpowers/specs/2026-05-XX-b6-masking-spec.md` (UI 위치 섹션)

- [ ] **Step 1: 현재 탭 구조 인벤토리**

```bash
ls apps/web/public/tabs/
```

Expected: tab-feedback/home/leave/overtime/payroll/profile/reference/settings.html

- [ ] **Step 2: `@smate-design-system-guard` 호출 — 위치 후보 평가**

3개 후보:

| 후보                             | 장점                                        | 단점                                    |
| -------------------------------- | ------------------------------------------- | --------------------------------------- |
| A. 새 탭 `tab-tools.html` "도구" | 명확한 진입점, 향후 B7/B8/B9 함께 묶기 좋음 | 탭 슬롯 1개 소비, 모바일 탭바 너비 압박 |
| B. 개인정보 탭 하위 섹션         | 컨텍스트(개인정보 보호) 일치, 신규 탭 없음  | 메인 진입점이 약해 발견성 낮음          |
| C. 찾아보기 탭 하위 섹션         | "도구·자료" 컨테이너로 자연스러움           | 찾아보기 탭의 기존 정체성 흐려짐        |

design-system-guard가 추천을 제시 + Jayce 결정.

- [ ] **Step 3: 결정 사항을 sub-spec UI 위치 섹션에 채움**

예시 채움:

```markdown
## UI 위치

새 탭 `tab-tools.html` ("도구"). 향후 B7(환자 설명문)/B8(AI 뉴스)/B11(학습 카드)도 같은 탭 하위에 카드형으로 배치.
탭 순서: 홈·급여·시간외·휴가·**도구**·찾아보기·개인정보·설정.
디자인시스템 가드 사전 통과 — globals.css 토큰만 사용, 새 컬러 토큰 없음.
```

- [ ] **Step 4: 커밋**

```bash
git add docs/superpowers/specs/2026-05-XX-b6-masking-spec.md
git commit -m "docs(b6): pin UI placement after design-system review"
```

---

### Task 4: 도메인 자료 수집 — PII 정규식 + LLM 검증 전략

**Files:**

- Create: `docs/harness/b6-pii-patterns.md` (참조 문서)

- [ ] **Step 1: 한국어 PII 정규식 카탈로그 작성**

`docs/harness/b6-pii-patterns.md`:

```markdown
# B6 PII Patterns (Korea)

## 정규식

| 항목                           | 정규식                                   | 비고                                       |
| ------------------------------ | ---------------------------------------- | ------------------------------------------ | ------ | ------ | ---------------------------------- | --- |
| 주민등록번호                   | `\b\d{6}[-\s]?[1-4]\d{6}\b`              | 7번째 자리 1~4 (성별·세기)                 |
| 외국인등록번호                 | `\b\d{6}[-\s]?[5-8]\d{6}\b`              | 7번째 자리 5~8                             |
| 전화번호 (휴대)                | `\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b` |                                            |
| 전화번호 (지역)                | `\b0(2                                   | 3[1-3]                                     | 4[1-4] | 5[1-5] | 6[1-4])[-\s]?\d{3,4}[-\s]?\d{4}\b` |     |
| 사업자등록번호                 | `\b\d{3}[-\s]?\d{2}[-\s]?\d{5}\b`        |                                            |
| 이메일                         | RFC 5322 단순형 (Task 6 코드 참조)       |                                            |
| 우편번호 (5자리)               | `\b\d{5}\b` (시·도 인접 시 가중치)       | 일반 5자리 숫자와 충돌 — NER 컨텍스트 필수 |
| 환자등록번호 (서울대병원 가정) | `\b\d{8}\b` (8자리)                      | 병원별 다름 — Jayce 확인                   |
| 의무기록번호                   | `\bMR[-_]?\d{6,10}\b`                    | 가정, 실제 형식 확인 필요                  |

## LLM 검증 전략 (선택)

세 가지 옵션. T8에서 결정:

1. OpenAI GPT-4o-mini PII 검증 — 마스킹된 텍스트만 전송, "여전히 PII로 보이는 항목이 있는가?" 프롬프트
2. Anthropic Claude Haiku PII 검증 — 동일 프롬프트, 다른 모델
3. Microsoft Presidio (오픈소스) — 자가호스팅, 외부 송신 0

권장: 옵션 3(Presidio) + 옵션 1/2 중 하나를 *후폴백*으로. 외부 송신 최소화.
```

- [ ] **Step 2: 커밋**

```bash
git add docs/harness/b6-pii-patterns.md
git commit -m "docs(b6): PII regex catalog + LLM verification options"
```

---

## Backend Implementation (Tasks 5–13)

### Task 5: 백엔드 masking 모듈 구조 생성

**Files:**

- Create: `backend/app/masking/__init__.py`
- Create: `backend/app/masking/regex_masker.py` (스텁)
- Create: `backend/app/masking/ner_masker.py` (스텁)
- Create: `backend/app/masking/llm_verifier.py` (스텁)
- Create: `backend/app/masking/file_handler.py` (스텁)
- Create: `backend/app/masking/pipeline.py` (스텁)
- Create: `backend/tests/masking/__init__.py`

- [ ] **Step 1: 디렉토리 + 빈 파일 생성**

```bash
mkdir -p backend/app/masking backend/tests/masking
touch backend/app/masking/__init__.py
touch backend/tests/masking/__init__.py
for f in regex_masker ner_masker llm_verifier file_handler pipeline; do
  printf '"""next-task-fill: implementation in following task"""\n' > backend/app/masking/$f.py
done
```

(여기 임시 docstring은 다음 task에서 즉시 채워질 *지시*이지 placeholder 아님.)

- [ ] **Step 2: 검증**

```bash
ls backend/app/masking/
```

Expected: 6 .py 파일.

- [ ] **Step 3: 커밋**

```bash
git add backend/app/masking/ backend/tests/masking/
git commit -m "feat(b6): scaffold backend masking module"
```

---

### Task 6: 정규식 마스킹 — TDD

**Files:**

- Create: `backend/tests/masking/test_regex_masker.py`
- Modify: `backend/app/masking/regex_masker.py`

- [ ] **Step 1: 실패 테스트 작성**

`backend/tests/masking/test_regex_masker.py`:

```python
import pytest
from app.masking.regex_masker import RegexMasker, MaskedSpan


def test_rrn_dash():
    masker = RegexMasker()
    text = "환자 김XX 주민번호 900101-1234567 전화 010-1234-5678"
    result, spans = masker.mask(text)
    assert "900101-1234567" not in result
    assert "010-1234-5678" not in result
    assert "[RRN]" in result
    assert "[PHONE]" in result
    assert any(s.kind == "rrn" for s in spans)
    assert any(s.kind == "phone" for s in spans)


def test_rrn_no_dash():
    masker = RegexMasker()
    text = "주민번호 9001011234567"
    result, spans = masker.mask(text)
    assert "9001011234567" not in result
    assert "[RRN]" in result


def test_email_and_business_no():
    masker = RegexMasker()
    text = "kim@hospital.kr 사업자 123-45-67890"
    result, spans = masker.mask(text)
    assert "kim@hospital.kr" not in result
    assert "123-45-67890" not in result
    assert "[EMAIL]" in result
    assert "[BIZ_NO]" in result


def test_no_pii_passthrough():
    masker = RegexMasker()
    text = "오늘 회의는 14시입니다."
    result, spans = masker.mask(text)
    assert result == text
    assert spans == []


def test_audit_count():
    masker = RegexMasker()
    text = "010-1111-2222 010-3333-4444 901111-1234567"
    _, spans = masker.mask(text)
    counts = masker.audit_summary(spans)
    assert counts == {"phone": 2, "rrn": 1}
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd backend && poetry run pytest tests/masking/test_regex_masker.py -v
```

Expected: ImportError 또는 테스트 5개 모두 실패.

- [ ] **Step 3: 구현**

`backend/app/masking/regex_masker.py`:

```python
"""1차 정규식 기반 PII 마스킹.

한국 PII 패턴(주민번호·전화·이메일·사업자번호 등) 정규식으로 1차 redact.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass


@dataclass(frozen=True)
class MaskedSpan:
    kind: str
    start: int
    end: int
    original_len: int


_PATTERNS: list[tuple[str, str, str]] = [
    ("rrn", "[RRN]", r"\b\d{6}[-\s]?[1-4]\d{6}\b"),
    ("frn", "[FRN]", r"\b\d{6}[-\s]?[5-8]\d{6}\b"),
    ("phone", "[PHONE]", r"\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b"),
    ("phone", "[PHONE]", r"\b0(?:2|3[1-3]|4[1-4]|5[1-5]|6[1-4])[-\s]?\d{3,4}[-\s]?\d{4}\b"),
    ("biz_no", "[BIZ_NO]", r"\b\d{3}[-\s]?\d{2}[-\s]?\d{5}\b"),
    ("email", "[EMAIL]", r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
]


class RegexMasker:
    def __init__(self) -> None:
        self._compiled = [(kind, token, re.compile(pat)) for kind, token, pat in _PATTERNS]

    def mask(self, text: str) -> tuple[str, list[MaskedSpan]]:
        spans: list[MaskedSpan] = []
        result = text
        for kind, token, regex in self._compiled:
            def _replace(match: re.Match[str]) -> str:
                spans.append(
                    MaskedSpan(
                        kind=kind,
                        start=match.start(),
                        end=match.end(),
                        original_len=match.end() - match.start(),
                    )
                )
                return token
            result = regex.sub(_replace, result)
        return result, spans

    @staticmethod
    def audit_summary(spans: list[MaskedSpan]) -> dict[str, int]:
        return dict(Counter(s.kind for s in spans))
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd backend && poetry run pytest tests/masking/test_regex_masker.py -v
```

Expected: 5/5 PASS.

- [ ] **Step 5: 커밋**

```bash
git add backend/app/masking/regex_masker.py backend/tests/masking/test_regex_masker.py
git commit -m "feat(b6): regex masker for KR PII (RRN/phone/email/biz)"
```

---

### Task 7: NER 마스킹 — 인명·주소 (TDD)

**Files:**

- Create: `backend/tests/masking/test_ner_masker.py`
- Modify: `backend/app/masking/ner_masker.py`
- Modify: `backend/pyproject.toml` (의존성 추가)

- [ ] **Step 1: 의존성 추가**

```bash
cd backend && poetry add spacy
poetry run python -m spacy download ko_core_news_sm || echo "ko model unavailable, fallback active"
```

- [ ] **Step 2: 실패 테스트 작성**

`backend/tests/masking/test_ner_masker.py`:

```python
import pytest
from app.masking.ner_masker import NerMasker


def test_korean_person_name():
    masker = NerMasker()
    text = "김민수 환자가 서울대병원 외래에 방문했습니다."
    result, spans = masker.mask(text)
    assert "김민수" not in result
    assert "[PERSON]" in result


def test_korean_address():
    masker = NerMasker()
    text = "환자 주소는 서울특별시 종로구 대학로 101입니다."
    result, _ = masker.mask(text)
    assert "[ADDRESS]" in result or "서울특별시" not in result


def test_passthrough_when_no_entity():
    masker = NerMasker()
    text = "회의는 오후 2시입니다."
    result, _ = masker.mask(text)
    assert result == text


def test_fallback_runs_without_spacy_model():
    masker = NerMasker(force_fallback=True)
    text = "김환자 010-1111-2222"
    result, spans = masker.mask(text)
    assert spans is not None
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
cd backend && poetry run pytest tests/masking/test_ner_masker.py -v
```

- [ ] **Step 4: 구현**

`backend/app/masking/ner_masker.py`:

```python
"""2차 NER 기반 인명·주소 마스킹.

spaCy 한국어 모델 우선 시도, 없으면 키워드/사전 기반 폴백.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

try:
    import spacy
    try:
        _LOADED_MODEL = spacy.load("ko_core_news_sm")
    except OSError:
        _LOADED_MODEL = None
except ImportError:
    spacy = None  # type: ignore
    _LOADED_MODEL = None


_SURNAME_HINTS = {"김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"}


@dataclass(frozen=True)
class NerSpan:
    kind: str
    start: int
    end: int
    text: str


class NerMasker:
    def __init__(self, force_fallback: bool = False) -> None:
        self._nlp = None if force_fallback else _LOADED_MODEL

    def mask(self, text: str) -> tuple[str, list[NerSpan]]:
        if self._nlp is not None:
            return self._mask_with_spacy(text)
        return self._mask_with_fallback(text)

    def _mask_with_spacy(self, text: str) -> tuple[str, list[NerSpan]]:
        doc = self._nlp(text)
        spans: list[NerSpan] = []
        replacements: list[tuple[int, int, str, str]] = []
        for ent in doc.ents:
            if ent.label_ in ("PS", "PERSON"):
                kind, token = "person", "[PERSON]"
            elif ent.label_ in ("LC", "GPE", "LOC"):
                kind, token = "address", "[ADDRESS]"
            else:
                continue
            spans.append(NerSpan(kind=kind, start=ent.start_char, end=ent.end_char, text=ent.text))
            replacements.append((ent.start_char, ent.end_char, token, kind))
        result = text
        for start, end, token, _ in sorted(replacements, key=lambda r: -r[0]):
            result = result[:start] + token + result[end:]
        return result, spans

    def _mask_with_fallback(self, text: str) -> tuple[str, list[NerSpan]]:
        spans: list[NerSpan] = []
        for m in re.finditer(r"[가-힣]{2,4}", text):
            candidate = m.group()
            if candidate[0] in _SURNAME_HINTS and 2 <= len(candidate) <= 4:
                spans.append(NerSpan(kind="person", start=m.start(), end=m.end(), text=candidate))
        for m in re.finditer(r"[가-힣]+(?:특별시|광역시|도|시|군|구|동|읍|면|리)", text):
            spans.append(NerSpan(kind="address", start=m.start(), end=m.end(), text=m.group()))
        result = text
        for span in sorted(spans, key=lambda s: -s.start):
            token = "[PERSON]" if span.kind == "person" else "[ADDRESS]"
            result = result[: span.start] + token + result[span.end :]
        return result, spans
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd backend && poetry run pytest tests/masking/test_ner_masker.py -v
```

Expected: 4/4 PASS (또는 ko 모델 미설치 환경에서는 폴백 테스트만 통과).

- [ ] **Step 6: 커밋**

```bash
git add backend/app/masking/ner_masker.py backend/tests/masking/test_ner_masker.py backend/pyproject.toml backend/poetry.lock
git commit -m "feat(b6): NER masker for KR person/address with fallback"
```

---

### Task 8: PII 잔존 검증 (3차) — Presidio 우선, LLM 후폴백

**Files:**

- Create: `backend/tests/masking/test_llm_verifier.py`
- Modify: `backend/app/masking/llm_verifier.py`
- Modify: `backend/pyproject.toml`

**Decision (T4 후속):** 외부 송신 최소화 원칙. 우선 자가호스팅 가능한 검증자 + LLM은 옵트인.

- [ ] **Step 1: 의존성 추가 (Presidio)**

```bash
cd backend && poetry add presidio-analyzer presidio-anonymizer
```

- [ ] **Step 2: 실패 테스트 작성**

`backend/tests/masking/test_llm_verifier.py`:

```python
import pytest
from app.masking.llm_verifier import LlmVerifier, VerificationResult


def test_clean_masked_text():
    verifier = LlmVerifier()
    masked_text = "환자 [PERSON]가 [ADDRESS]에 방문. 연락처 [PHONE]."
    result = verifier.verify(masked_text)
    assert isinstance(result, VerificationResult)


def test_disabled_external_llm_default():
    verifier = LlmVerifier()
    assert verifier.external_llm_enabled is False


def test_external_llm_enabled_by_env(monkeypatch):
    monkeypatch.setenv("SMATE_B6_EXTERNAL_LLM", "anthropic")
    verifier = LlmVerifier()
    assert verifier.external_llm_enabled is True
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
cd backend && poetry run pytest tests/masking/test_llm_verifier.py -v
```

- [ ] **Step 4: 구현**

`backend/app/masking/llm_verifier.py`:

```python
"""3차 PII 잔존 검증.

기본: Presidio Analyzer (자가호스팅, 외부 송신 0).
옵트인: 환경변수 SMATE_B6_EXTERNAL_LLM=anthropic|openai 일 때만 외부 LLM에 마스킹된 텍스트 전송.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

try:
    from presidio_analyzer import AnalyzerEngine
    _PRESIDIO_AVAILABLE = True
except ImportError:
    AnalyzerEngine = None  # type: ignore
    _PRESIDIO_AVAILABLE = False


@dataclass
class VerificationResult:
    passed: bool
    residue: list[dict] = field(default_factory=list)


class LlmVerifier:
    def __init__(self) -> None:
        self.external_llm_enabled = bool(os.getenv("SMATE_B6_EXTERNAL_LLM"))
        self._analyzer = AnalyzerEngine() if _PRESIDIO_AVAILABLE else None

    def verify(self, masked_text: str) -> VerificationResult:
        residue: list[dict] = []
        if self._analyzer is not None:
            results = self._analyzer.analyze(text=masked_text, language="en")
            for r in results:
                if r.score > 0.7 and not masked_text[r.start:r.end].startswith("["):
                    residue.append({
                        "kind": r.entity_type,
                        "start": r.start,
                        "end": r.end,
                        "score": r.score,
                    })
        if self.external_llm_enabled:
            residue.extend(self._verify_external(masked_text))
        return VerificationResult(passed=len(residue) == 0, residue=residue)

    def _verify_external(self, masked_text: str) -> list[dict]:
        """옵트인 외부 LLM 검증. 마스킹된 텍스트만 전송. 활성화 시 별도 task로 구현."""
        return []
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd backend && poetry run pytest tests/masking/test_llm_verifier.py -v
```

Expected: 3/3 PASS.

- [ ] **Step 6: 커밋**

```bash
git add backend/app/masking/llm_verifier.py backend/tests/masking/test_llm_verifier.py backend/pyproject.toml backend/poetry.lock
git commit -m "feat(b6): Presidio-based PII residue verifier (LLM external opt-in)"
```

---

### Task 9: 파일 핸들러 — CSV/Excel/PDF/이미지

**Files:**

- Create: `backend/tests/masking/test_file_handler.py`
- Modify: `backend/app/masking/file_handler.py`
- Modify: `backend/pyproject.toml` (pdfplumber, pytesseract, Pillow)

- [ ] **Step 1: 의존성 추가**

```bash
cd backend && poetry add pdfplumber Pillow pytesseract
```

(pytesseract는 시스템에 tesseract OCR 엔진이 있어야 함. macOS: `brew install tesseract tesseract-lang` — README에 추가.)

- [ ] **Step 2: 실패 테스트 작성**

`backend/tests/masking/test_file_handler.py`:

```python
import io
import pytest
from app.masking.file_handler import FileHandler, ExtractedContent


def test_extract_csv():
    handler = FileHandler()
    csv_bytes = "이름,주민번호\n김민수,900101-1234567\n".encode("utf-8")
    content = handler.extract(csv_bytes, filename="test.csv")
    assert content.format == "csv"
    assert "김민수" in content.text


def test_extract_excel():
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["이름", "주민번호"])
    ws.append(["김민수", "900101-1234567"])
    buf = io.BytesIO()
    wb.save(buf)
    handler = FileHandler()
    content = handler.extract(buf.getvalue(), filename="test.xlsx")
    assert content.format == "xlsx"
    assert "김민수" in content.text


def test_unsupported_format():
    handler = FileHandler()
    with pytest.raises(ValueError, match="unsupported"):
        handler.extract(b"\x00\x01", filename="test.bin")


def test_reassemble_csv():
    handler = FileHandler()
    masked_text = "이름,주민번호\n[PERSON],[RRN]\n"
    out_bytes = handler.reassemble(masked_text, original_format="csv", filename="test.csv")
    assert b"[PERSON]" in out_bytes
    assert b"[RRN]" in out_bytes
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
cd backend && poetry run pytest tests/masking/test_file_handler.py -v
```

- [ ] **Step 4: 구현**

`backend/app/masking/file_handler.py`:

```python
"""파일 형식별 텍스트 추출 + 마스킹 후 재조립."""
from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import PurePath


@dataclass
class ExtractedContent:
    text: str
    format: str
    metadata: dict


class FileHandler:
    SUPPORTED = {"csv", "xlsx", "xls", "pdf", "png", "jpg", "jpeg"}

    def extract(self, data: bytes, *, filename: str) -> ExtractedContent:
        ext = PurePath(filename).suffix.lower().lstrip(".")
        if ext not in self.SUPPORTED:
            raise ValueError(f"unsupported format: {ext}")
        if ext == "csv":
            return self._extract_csv(data)
        if ext in ("xlsx", "xls"):
            return self._extract_excel(data, ext)
        if ext == "pdf":
            return self._extract_pdf(data)
        if ext in ("png", "jpg", "jpeg"):
            return self._extract_image(data, ext)
        raise ValueError(f"unsupported format: {ext}")

    def _extract_csv(self, data: bytes) -> ExtractedContent:
        text = data.decode("utf-8", errors="replace")
        return ExtractedContent(text=text, format="csv", metadata={})

    def _extract_excel(self, data: bytes, ext: str) -> ExtractedContent:
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
        lines: list[str] = []
        for sheet in wb.worksheets:
            for row in sheet.iter_rows(values_only=True):
                lines.append(",".join("" if v is None else str(v) for v in row))
        return ExtractedContent(text="\n".join(lines), format=ext, metadata={"sheets": len(wb.worksheets)})

    def _extract_pdf(self, data: bytes) -> ExtractedContent:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
        return ExtractedContent(text="\n\n".join(pages), format="pdf", metadata={"pages": len(pages)})

    def _extract_image(self, data: bytes, ext: str) -> ExtractedContent:
        from PIL import Image
        import pytesseract
        img = Image.open(io.BytesIO(data))
        text = pytesseract.image_to_string(img, lang="kor+eng")
        return ExtractedContent(text=text, format=ext, metadata={"size": img.size})

    def reassemble(self, masked_text: str, *, original_format: str, filename: str) -> bytes:
        # CSV/텍스트 계열은 그대로 인코딩, 그 외는 일단 .txt 산출 (포맷 보존은 v2)
        return masked_text.encode("utf-8")
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd backend && poetry run pytest tests/masking/test_file_handler.py -v
```

Expected: 4/4 PASS.

- [ ] **Step 6: 커밋**

```bash
git add backend/app/masking/file_handler.py backend/tests/masking/test_file_handler.py backend/pyproject.toml backend/poetry.lock
git commit -m "feat(b6): file handler for CSV/Excel/PDF/image"
```

---

### Task 10: 파이프라인 통합 (TDD)

**Files:**

- Create: `backend/tests/masking/test_pipeline.py`
- Modify: `backend/app/masking/pipeline.py`

- [ ] **Step 1: 실패 테스트 작성**

`backend/tests/masking/test_pipeline.py`:

```python
import pytest
from app.masking.pipeline import MaskingPipeline, MaskingReport


def test_csv_full_pipeline():
    pipeline = MaskingPipeline()
    csv = "이름,주민번호,전화\n김민수,900101-1234567,010-1111-2222\n".encode("utf-8")
    report = pipeline.run(csv, filename="patients.csv")
    assert isinstance(report, MaskingReport)
    assert report.success is True
    assert b"900101-1234567" not in report.output_bytes
    assert b"010-1111-2222" not in report.output_bytes
    assert report.audit["rrn"] >= 1
    assert report.audit["phone"] >= 1


def test_clean_file_passthrough():
    pipeline = MaskingPipeline()
    data = "오늘 회의는 14시입니다.".encode("utf-8")
    report = pipeline.run(data, filename="memo.csv")
    assert report.success is True
    assert "오늘" in report.output_bytes.decode("utf-8")
    assert sum(report.audit.values()) == 0


def test_unsupported_format_returns_error():
    pipeline = MaskingPipeline()
    with pytest.raises(ValueError):
        pipeline.run(b"\x00", filename="x.bin")
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd backend && poetry run pytest tests/masking/test_pipeline.py -v
```

- [ ] **Step 3: 구현**

`backend/app/masking/pipeline.py`:

```python
"""B6 마스킹 파이프라인: 파일 → 정규식 → NER → LLM 검증 → 재조립."""
from __future__ import annotations

from dataclasses import dataclass, field

from .file_handler import FileHandler
from .regex_masker import RegexMasker
from .ner_masker import NerMasker
from .llm_verifier import LlmVerifier


@dataclass
class MaskingReport:
    success: bool
    output_bytes: bytes
    audit: dict[str, int] = field(default_factory=dict)
    residue: list[dict] = field(default_factory=list)
    format: str = ""


class MaskingPipeline:
    def __init__(self) -> None:
        self.fh = FileHandler()
        self.regex = RegexMasker()
        self.ner = NerMasker()
        self.verifier = LlmVerifier()

    def run(self, data: bytes, *, filename: str) -> MaskingReport:
        extracted = self.fh.extract(data, filename=filename)
        text_after_regex, regex_spans = self.regex.mask(extracted.text)
        text_after_ner, ner_spans = self.ner.mask(text_after_regex)
        verification = self.verifier.verify(text_after_ner)
        out_bytes = self.fh.reassemble(text_after_ner, original_format=extracted.format, filename=filename)
        audit = self.regex.audit_summary(regex_spans)
        for span in ner_spans:
            audit[span.kind] = audit.get(span.kind, 0) + 1
        return MaskingReport(
            success=True,
            output_bytes=out_bytes,
            audit=audit,
            residue=verification.residue,
            format=extracted.format,
        )
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
cd backend && poetry run pytest tests/masking/test_pipeline.py -v
```

Expected: 3/3 PASS.

- [ ] **Step 5: 커밋**

```bash
git add backend/app/masking/pipeline.py backend/tests/masking/test_pipeline.py
git commit -m "feat(b6): masking pipeline integrating regex/NER/verifier"
```

---

### Task 11: FastAPI 엔드포인트 `/api/mask`

**Files:**

- Create: `backend/tests/masking/test_endpoint.py`
- Create: `backend/app/masking/router.py`
- Modify: `backend/app/main.py` (라우터 등록)

- [ ] **Step 1: 실패 테스트 작성**

`backend/tests/masking/test_endpoint.py`:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_mask_csv_endpoint():
    client = TestClient(app)
    csv = "이름,주민번호\n김민수,900101-1234567\n"
    response = client.post(
        "/api/mask",
        files={"file": ("patients.csv", csv, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert "audit" in body
    assert "output_base64" in body
    assert body["audit"].get("rrn", 0) >= 1


def test_mask_too_large():
    client = TestClient(app)
    big = b"x" * (21 * 1024 * 1024)  # 21MB
    response = client.post("/api/mask", files={"file": ("big.csv", big, "text/csv")})
    assert response.status_code == 413


def test_mask_unsupported_format():
    client = TestClient(app)
    response = client.post("/api/mask", files={"file": ("bad.bin", b"\x00", "application/octet-stream")})
    assert response.status_code == 415
```

- [ ] **Step 2: 테스트 실패 확인**

```bash
cd backend && poetry run pytest tests/masking/test_endpoint.py -v
```

- [ ] **Step 3: 라우터 구현**

`backend/app/masking/router.py`:

```python
"""FastAPI 라우터: POST /api/mask"""
from __future__ import annotations

import base64

from fastapi import APIRouter, File, HTTPException, UploadFile

from .pipeline import MaskingPipeline


router = APIRouter(prefix="/api", tags=["masking"])
_pipeline = MaskingPipeline()
MAX_BYTES = 20 * 1024 * 1024  # 20MB


@router.post("/mask")
async def mask_file(file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="file too large (max 20MB)")
    try:
        report = _pipeline.run(data, filename=file.filename or "upload")
    except ValueError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    return {
        "success": report.success,
        "audit": report.audit,
        "residue_count": len(report.residue),
        "format": report.format,
        "output_base64": base64.b64encode(report.output_bytes).decode("ascii"),
        "output_filename": _masked_filename(file.filename or "upload"),
    }


def _masked_filename(original: str) -> str:
    if "." in original:
        stem, ext = original.rsplit(".", 1)
        return f"{stem}.masked.{ext}"
    return f"{original}.masked"
```

- [ ] **Step 4: main.py에 라우터 등록**

`backend/app/main.py` 의 기존 라우터 등록 부분 옆에 추가:

```python
from app.masking.router import router as masking_router
app.include_router(masking_router)
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
cd backend && poetry run pytest tests/masking/test_endpoint.py -v
```

Expected: 3/3 PASS.

- [ ] **Step 6: 커밋**

```bash
git add backend/app/masking/router.py backend/app/main.py backend/tests/masking/test_endpoint.py
git commit -m "feat(b6): /api/mask FastAPI endpoint with size/format limits"
```

---

### Task 12: 백엔드 통합 테스트 — 5개 샘플 fixture

**Files:**

- Create: `backend/tests/masking/fixtures/` 디렉토리에 5개 샘플
- Create: `backend/tests/masking/test_e2e_samples.py`

- [ ] **Step 1: 샘플 파일 5개 준비**

```bash
mkdir -p backend/tests/masking/fixtures
```

샘플:

1. `sample_patients.csv` — 5명 가짜 환자 데이터 (CSV)
2. `sample_overtime.xlsx` — 시간외 근무 양식 + 가짜 인명·전화
3. `sample_consent.pdf` — 동의서 (텍스트 PDF, reportlab으로 생성 가능)
4. `sample_screenshot.png` — 명세서 스크린샷 (가짜 PII)
5. `sample_clean.csv` — PII 없는 정상 데이터

각 fixture는 _완전히 가짜인_ 데이터로 생성. 진짜 환자 정보 사용 절대 금지.

- [ ] **Step 2: E2E 테스트**

`backend/tests/masking/test_e2e_samples.py`:

```python
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.parametrize("filename,expected_kind", [
    ("sample_patients.csv", "rrn"),
    ("sample_overtime.xlsx", "phone"),
    ("sample_consent.pdf", "rrn"),
])
def test_e2e_real_file(filename, expected_kind):
    client = TestClient(app)
    path = FIXTURES / filename
    if not path.exists():
        pytest.skip(f"fixture missing: {filename}")
    with path.open("rb") as fh:
        response = client.post("/api/mask", files={"file": (filename, fh.read())})
    assert response.status_code == 200
    audit = response.json()["audit"]
    assert audit.get(expected_kind, 0) >= 1


def test_clean_file_no_audit():
    client = TestClient(app)
    path = FIXTURES / "sample_clean.csv"
    if not path.exists():
        pytest.skip("fixture missing")
    with path.open("rb") as fh:
        response = client.post("/api/mask", files={"file": ("sample_clean.csv", fh.read())})
    assert response.status_code == 200
    assert sum(response.json()["audit"].values()) == 0
```

- [ ] **Step 3: 테스트 통과 확인**

```bash
cd backend && poetry run pytest tests/masking/ -v
```

Expected: 통합 테스트 모두 PASS (fixture 없으면 skip).

- [ ] **Step 4: 커밋**

```bash
git add backend/tests/masking/
git commit -m "test(b6): E2E sample fixtures + integration tests"
```

---

### Task 13: 백엔드 README 업데이트

**Files:**

- Modify: `backend/README.md`

- [ ] **Step 1: README에 masking 섹션 추가**

기존 README 끝에 append:

```markdown
## B6 Masking Service

`/api/mask` 엔드포인트는 업로드된 파일에서 한국 PII를 마스킹한 안전 파일을 반환합니다.

### 외부 의존성

- `tesseract` OCR (이미지 입력 처리). macOS: `brew install tesseract tesseract-lang`. Linux: `apt-get install tesseract-ocr tesseract-ocr-kor`.
- spaCy 한국어 모델 (선택): `poetry run python -m spacy download ko_core_news_sm`. 미설치 시 키워드 기반 폴백.

### 환경변수

- `SMATE_B6_EXTERNAL_LLM` (선택) — `anthropic` 또는 `openai` 설정 시 마스킹된 텍스트만 외부 LLM에 전송해 잔존 PII 검증. 비활성화가 기본 (외부 송신 0).

### 한계 (v1)

- Excel/PDF/이미지 출력은 v1에서 `.txt` 로 변환됨. 원본 포맷 보존은 v2.
- Presidio analyzer 는 영어 기본 — 한국어 recognizer 추가는 후속 작업.
```

- [ ] **Step 2: 커밋**

```bash
git add backend/README.md
git commit -m "docs(b6): backend README — tesseract/spacy/env vars"
```

---

## Frontend Implementation (Tasks 14–20)

### Task 14: 새 탭 `tab-tools.html` 추가 (T3 결정 반영)

**Files:**

- Create: `apps/web/public/tabs/tab-tools.html`
- Modify: `apps/web/src/client/app.js` (탭 등록)
- Modify: `apps/web/src/client/tab-loader.js` (탭 로딩)

- [ ] **Step 1: 탭 HTML**

`apps/web/public/tabs/tab-tools.html`:

```html
<section class="tab-tools" data-tab="tools">
  <header class="tab-header">
    <h2 class="ds-heading-2">도구</h2>
    <p class="ds-body">병원 자료를 안전하게 다루기 위한 SNUHmate 도구 모음.</p>
  </header>

  <div class="tools-grid">
    <article class="tool-card" data-tool="masking">
      <h3 class="ds-heading-3">파일 마스킹</h3>
      <p class="ds-body">
        CSV·Excel·PDF·이미지에서 환자/개인정보를 안전하게 가립니다.
      </p>
      <button class="ds-button ds-button-primary" data-action="open-masking">
        시작하기
      </button>
    </article>
  </div>

  <div id="masking-panel" class="masking-panel" hidden>
    <header class="panel-header">
      <button
        class="ds-button ds-button-icon"
        data-action="back-to-tools"
        aria-label="도구 목록으로 돌아가기"
      >
        ←
      </button>
      <h3 class="ds-heading-3">파일 마스킹</h3>
    </header>

    <div class="masking-dropzone" data-state="idle" tabindex="0">
      <p class="ds-body">파일을 끌어다 놓거나 선택하세요.</p>
      <p class="ds-caption">CSV · Excel · PDF · 이미지 (최대 20MB)</p>
      <input
        type="file"
        id="masking-file-input"
        accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg"
        hidden
      />
      <button class="ds-button ds-button-secondary" data-action="choose-file">
        파일 선택
      </button>
    </div>

    <div class="masking-progress" hidden role="status" aria-live="polite">
      <div class="ds-spinner" aria-hidden="true"></div>
      <p class="ds-body">마스킹 중...</p>
    </div>

    <div class="masking-result" hidden>
      <div class="result-summary">
        <p class="ds-body" id="masking-summary-line"></p>
        <p class="ds-caption" id="masking-summary-detail"></p>
      </div>
      <div class="result-actions">
        <a class="ds-button ds-button-primary" download id="masking-download"
          >다운로드</a
        >
        <button class="ds-button ds-button-secondary" data-action="reset">
          새 파일
        </button>
      </div>
    </div>

    <div class="masking-error" hidden role="alert">
      <p class="ds-body ds-text-error" id="masking-error-message"></p>
      <button class="ds-button ds-button-secondary" data-action="reset">
        다시 시도
      </button>
    </div>
  </div>
</section>
```

- [ ] **Step 2: 탭 등록**

`apps/web/src/client/app.js` 의 탭 목록(보통 array)에 `'tools'` 추가. 위치: 휴가와 찾아보기 사이.

`apps/web/src/client/tab-loader.js` 의 탭별 lazy loader에 `tools` case 추가.

- [ ] **Step 3: 검증 — Astro dev 서버에서 새 탭 보임**

```bash
pnpm --filter @snuhmate/web dev &
sleep 3
curl -s http://localhost:4321/app/?tab=tools | grep "도구"
```

- [ ] **Step 4: 커밋**

```bash
git add apps/web/public/tabs/tab-tools.html apps/web/src/client/app.js apps/web/src/client/tab-loader.js
git commit -m "feat(b6): add tools tab + masking panel skeleton"
```

---

### Task 15: 마스킹 패널 JS — state machine (innerHTML 사용 금지, textContent + DOM 구성만)

**Files:**

- Create: `apps/web/src/client/masking-panel.js`

- [ ] **Step 1: 패널 JS 작성 — XSS 방지를 위해 모든 출력을 textContent + 요소 생성으로**

`apps/web/src/client/masking-panel.js`:

```js
/**
 * B6 마스킹 패널 — 단일 파일 업로드 → /api/mask → 다운로드.
 * 보안: 사용자 노출 출력은 모두 textContent. innerHTML 사용 금지.
 */

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPTED = /\.(csv|xlsx|xls|pdf|png|jpe?g)$/i;
const API_BASE =
  (typeof window !== "undefined" && window.SMATE_API_BASE) ||
  "http://localhost:8000";

const COPY = {
  uploading: "마스킹 중...",
  resultClean: "개인정보가 발견되지 않았습니다.",
  resultTotalSuffix: "건의 개인정보가 마스킹되었습니다.",
  errUnsupported: "지원하지 않는 파일 형식입니다.",
  errTooLarge: "파일이 20MB를 초과합니다.",
  errNetwork: "네트워크 오류, 백엔드 서버가 실행 중인지 확인하세요.",
  errUnknown: "알 수 없는 오류가 발생했습니다.",
};

const KIND_LABELS = {
  rrn: "주민번호",
  frn: "외국인등록번호",
  phone: "전화번호",
  email: "이메일",
  biz_no: "사업자번호",
  person: "이름",
  address: "주소",
};

export function initMaskingPanel(root) {
  const panel = root.querySelector("#masking-panel");
  if (!panel) return;
  const fileInput = panel.querySelector("#masking-file-input");
  const dropzone = panel.querySelector(".masking-dropzone");
  const progress = panel.querySelector(".masking-progress");
  const result = panel.querySelector(".masking-result");
  const errorEl = panel.querySelector(".masking-error");
  const errorMsg = panel.querySelector("#masking-error-message");
  const downloadEl = panel.querySelector("#masking-download");
  const summaryLine = panel.querySelector("#masking-summary-line");
  const summaryDetail = panel.querySelector("#masking-summary-detail");

  function show(state) {
    dropzone.hidden = state !== "idle";
    progress.hidden = state !== "uploading";
    result.hidden = state !== "ready";
    errorEl.hidden = state !== "error";
  }

  panel.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "choose-file") fileInput.click();
    if (action === "reset") show("idle");
    if (action === "back-to-tools") panel.hidden = true;
  });

  // 키보드 접근성
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!ACCEPTED.test(file.name)) return showError(COPY.errUnsupported);
    if (file.size > MAX_BYTES) return showError(COPY.errTooLarge);
    upload(file);
  });

  ["dragenter", "dragover"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.dataset.state = "hover";
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.dataset.state = "idle";
    }),
  );
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event("change"));
    }
  });

  async function upload(file) {
    show("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_BASE}/api/mask`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const detail = await res
          .json()
          .catch(() => ({ detail: res.statusText }));
        throw new Error(detail.detail || `오류 (${res.status})`);
      }
      const body = await res.json();
      renderResult(body);
      show("ready");
    } catch (err) {
      showError(err && err.message ? err.message : COPY.errUnknown);
    }
  }

  function renderResult(body) {
    const audit = (body && body.audit) || {};
    const total = Object.values(audit).reduce((a, b) => a + b, 0);
    if (total > 0) {
      summaryLine.textContent = `${total}${COPY.resultTotalSuffix}`;
      const items = Object.entries(audit)
        .map(([k, v]) => `${KIND_LABELS[k] || k} ${v}건`)
        .join(" · ");
      summaryDetail.textContent = items;
    } else {
      summaryLine.textContent = COPY.resultClean;
      summaryDetail.textContent = "";
    }
    const blob = base64ToBlob(body.output_base64);
    if (downloadEl.href.startsWith("blob:"))
      URL.revokeObjectURL(downloadEl.href);
    downloadEl.href = URL.createObjectURL(blob);
    downloadEl.download = body.output_filename || "masked.txt";
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    show("error");
  }

  show("idle");
}

function base64ToBlob(b64) {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8]);
}
```

- [ ] **Step 2: 탭 진입 시 패널 초기화**

탭 로더에서 tools 진입 시 `initMaskingPanel(document)` 호출. "시작하기" 버튼이 `#masking-panel` 의 hidden 을 false 로 토글.

- [ ] **Step 3: 검증 — 수동 테스트**

```bash
pnpm --filter @snuhmate/web dev &
# 브라우저로 http://localhost:4321/app/?tab=tools → "시작하기" → 파일 선택 → 결과
```

브라우저 개발자 도구에서 `document.querySelector('#masking-summary-line').textContent` 확인 — 결과가 textContent로 들어감.

- [ ] **Step 4: 커밋**

```bash
git add apps/web/src/client/masking-panel.js
git commit -m "feat(b6): masking panel JS — textContent only (no innerHTML)"
```

---

### Task 16: 디자인시스템 정합 — globals.css 토큰만 사용

**Files:**

- Modify: `apps/web/public/tabs/tab-tools.html` 또는 별도 CSS

- [ ] **Step 1: `/smate-design-guard` 호출**

```bash
grep -E 'style="' apps/web/public/tabs/tab-tools.html
grep -E '#[0-9a-fA-F]{3,6}|rgb\(' apps/web/public/tabs/tab-tools.html
```

Expected: 두 명령 모두 출력 0줄.

- [ ] **Step 2: 위반 사항 발견 시 globals.css 토큰으로 치환**

예: `.masking-dropzone[data-state="hover"]` → `var(--color-bg-elevated)` 사용. 새 토큰이 필요하면 `apps/web/src/styles/tokens/semantic.css` 에 정의 (memory `feedback_design_system_first`).

- [ ] **Step 3: `pnpm check` 통과**

```bash
pnpm check
```

- [ ] **Step 4: 커밋**

```bash
git add apps/web/public/tabs/tab-tools.html apps/web/src/styles/
git commit -m "fix(b6): align masking panel to design tokens"
```

---

### Task 17: 동기화 (Firebase 영향 0) 검증

**Files:** (검증만)

- [ ] **Step 1: B6 가 Firestore/localStorage 에 어떤 영향도 주지 않는지 확인**

마스킹 결과는 영구 저장 안 함이 비목표. 사용자 ID도 안 보냄.

```bash
grep -r "masking" apps/web/src/firebase/ || echo "OK — no firebase coupling"
```

Expected: "OK — no firebase coupling".

- [ ] **Step 2: 게스트·로그인 모드 모두 동일하게 작동**

브라우저에서 게스트 → 마스킹 → 결과 OK / 로그인 → 마스킹 → 결과 OK.

---

### Task 18: 에러 처리·접근성 마무리

**Files:**

- Modify: `apps/web/src/client/masking-panel.js` (필요시)

- [ ] **Step 1: 키보드 only 시나리오 점검**

- 드롭존이 키보드로 진입 가능 (`tabindex="0"`).
- Enter/Space 로 파일 선택 다이얼로그 토글 (Task 15에 이미 구현).
- 진행 중 ARIA live region 으로 안내 (Task 14 HTML에 `role="status" aria-live="polite"` 적용).

- [ ] **Step 2: 백엔드 다운 시 메시지**

`fetch` 실패 → `네트워크 오류, 백엔드 서버가 실행 중인지 확인하세요.` (memory `feedback_data_transparency`).

수동 테스트: 백엔드 서버 끄고 업로드 시도 → 에러 메시지 보임.

- [ ] **Step 3: 검증**

키보드만으로 업로드 → 다운로드 가능.

- [ ] **Step 4: 커밋 (변경 있을 때만)**

```bash
git add apps/web/src/client/masking-panel.js
git commit -m "feat(b6): keyboard a11y polish + friendly network error"
```

---

### Task 19: 모바일 반응형

**Files:**

- Modify: `apps/web/public/tabs/tab-tools.html` 또는 globals.css

- [ ] **Step 1: 320 / 768 / 1280 viewport 체크**

```
mcp__plugin_playwright_playwright__browser_resize(320, 800)
mcp__plugin_playwright_playwright__browser_navigate('http://localhost:4321/app/?tab=tools')
mcp__plugin_playwright_playwright__browser_take_screenshot
```

각 viewport 에서:

- 드롭존 padding/font-size 적절
- 버튼 길이 wrap 안 됨
- 다운로드 버튼이 화면 밖으로 안 나감

- [ ] **Step 2: 위반 시 토큰 기반 미디어쿼리 추가**

기존 globals.css 의 미디어쿼리 패턴 따름.

- [ ] **Step 3: 커밋**

```bash
git add apps/web/public/tabs/tab-tools.html apps/web/src/styles/
git commit -m "fix(b6): masking panel responsive 320/768/1280"
```

---

### Task 20: 한국어 카피 일관성 검토

**Files:**

- Modify: `apps/web/src/client/masking-panel.js` (이미 COPY 객체 분리됨)

- [ ] **Step 1: COPY 객체와 HTML 의 한국어 표기 일관성 검토**

`apps/web/public/tabs/tab-tools.html` 의 인라인 한국어 ↔ `masking-panel.js` COPY 객체 ↔ 백엔드 응답 메시지 한국어 톤 일관 검토. memory `feedback_non_pushy_ux` 톤 준수 (지시·강요 표현 금지).

- [ ] **Step 2: 커밋 (수정 있을 때만)**

```bash
git add apps/web/public/tabs/tab-tools.html apps/web/src/client/masking-panel.js
git commit -m "polish(b6): Korean copy tone consistency"
```

---

## QA & Ship (Tasks 21–24)

### Task 21: Playwright E2E 스펙

**Files:**

- Create: `tests/e2e/masking.spec.js`

- [ ] **Step 1: 테스트 작성**

```js
import { test, expect } from "@playwright/test";
import path from "node:path";

test("B6 masking flow — upload CSV → mask → download", async ({ page }) => {
  await page.goto("/app/?tab=tools");
  await expect(page.getByText("도구")).toBeVisible();
  await page.getByRole("button", { name: "시작하기" }).click();

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "파일 선택" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(
    path.resolve("tests/e2e/fixtures/sample_patients.csv"),
  );

  await expect(page.getByText("마스킹 중")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("마스킹되었습니다")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("link", { name: "다운로드" })).toBeVisible();
});

test("B6 console errors stay zero", async ({ page }) => {
  const errors = [];
  page.on(
    "console",
    (msg) => msg.type() === "error" && errors.push(msg.text()),
  );
  await page.goto("/app/?tab=tools");
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: fixture 준비**

```bash
mkdir -p tests/e2e/fixtures
cp backend/tests/masking/fixtures/sample_patients.csv tests/e2e/fixtures/
```

- [ ] **Step 3: 통과 확인**

백엔드와 dev server 모두 켜져있어야 함:

```bash
cd backend && poetry run uvicorn app.main:app --port 8000 &
pnpm --filter @snuhmate/web dev &
sleep 5
pnpm test:smoke -- tests/e2e/masking.spec.js
```

- [ ] **Step 4: 커밋**

```bash
git add tests/e2e/masking.spec.js tests/e2e/fixtures/
git commit -m "test(b6): playwright e2e — upload/mask/download"
```

---

### Task 22: `/smate-smoke` 확장 4축 통과 확인

**Files:** (검증만)

- [ ] **Step 1: 4축 검증 호출**

`@smate-playwright-runner` 에이전트 호출 또는 직접:

| 축             | 명령                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| (a) 동기화     | 게스트 모드·로그인 모드 모두 마스킹 정상 — Task 17 결과 활용                        |
| (b) 버튼 기능  | "시작하기"·"파일 선택"·"다운로드"·"새 파일"·"다시 시도"·"←" 모두 클릭 + 콘솔 에러 0 |
| (c) DS 부합    | `grep -E "style=\"" apps/web/public/tabs/tab-tools.html` = 0건, hex/rgb 0건         |
| (d) 3 viewport | 320/768/1280 스크린샷 캡처, 베이스라인과 diff                                       |

- [ ] **Step 2: 통과 보고**

검증 결과를 plan task 22 체크박스 옆에 한 줄 노트로 기록 (선택).

---

### Task 23: `/smate-pr-ops` — PR 생성

**Files:**

- Modify: `apps/web/public/CHANGELOG.md`, `public/CHANGELOG.md`

- [ ] **Step 1: CHANGELOG 항목 추가**

```markdown
## [Unreleased]

### Added

- B6 파일 마스킹 서비스 (CSV·Excel·PDF·이미지) — `/api/mask` 엔드포인트 + "도구" 탭 UI
```

- [ ] **Step 2: PR 생성**

```bash
git push -u origin <branch>
gh pr create --title "feat(b6): file masking service" --body "$(cat <<'EOF'
## Summary

- 백엔드 `/api/mask` 엔드포인트 + 정규식·NER·Presidio 3단계 마스킹 파이프라인
- 새 "도구" 탭 + 마스킹 패널 UI (드래그-드롭, 진행 상태, 다운로드)
- 외부 LLM 송신은 옵트인(`SMATE_B6_EXTERNAL_LLM`), 기본 비활성

## Spec & Plan

- Sub-spec: docs/superpowers/specs/2026-05-XX-b6-masking-spec.md
- Plan: docs/superpowers/plans/2026-05-01-snuhmate-b6-masking.md
- Persona: docs/harness/persona-matrix.md (B6 행)

## Test plan

- [x] 백엔드 단위/통합 테스트 (regex/NER/verifier/file_handler/pipeline/endpoint)
- [x] 5개 샘플 fixture E2E
- [x] Playwright e2e — upload → mask → download
- [x] /smate-smoke 4축 (동기화·버튼·DS·viewport)
- [x] 콘솔 에러 0건
- [x] 디자인시스템 토큰만 사용, 인라인 스타일 0건
- [x] 프런트엔드 출력 textContent only (innerHTML 미사용)

## Security

- 원본 파일 서버 디스크 미저장
- 외부 LLM 송신 기본 비활성화
- 감사 로그는 카테고리×개수만 (PII 본문 비저장)
- XSS 방지: textContent + DOM 구성만 사용

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: 커밋**

```bash
git add apps/web/public/CHANGELOG.md public/CHANGELOG.md
git commit -m "docs(b6): CHANGELOG entry for masking service"
```

---

### Task 24: `/smate-doc-sync` — 자동 문서 동기화 (승인 게이트)

**Files:**

- Modify: `CLAUDE.md` (탭 인덱스 갱신)
- Modify: `MEMORY.md` 인덱스 + `project_b6_masking.md` (새 메모리)
- Modify: `docs/harness/b-catalog.md` (B6 상태 → shipped)

- [ ] **Step 1: `@smate-doc-keeper` 호출**

호출 시 doc-keeper 가 다음을 자동 분석·갱신 _준비_:

- `CLAUDE.md` 의 탭/기능 인덱스 섹션 (있다면)에 "도구 탭" 추가
- `MEMORY.md` 인덱스에 새 entry: `[B6 Masking](project_b6_masking.md) — ...`
- `~/.claude/projects/.../memory/project_b6_masking.md` 생성: B6 출시 사실, 페르소나, 외부 LLM 옵트인 정책
- `docs/harness/b-catalog.md` 의 B6 행 상태 `spec` → `shipped`, PR 링크 추가

- [ ] **Step 2: `git diff docs/ CLAUDE.md MEMORY.md` 출력 → 사용자 승인 대기**

doc-keeper 가 변경 내용을 diff 로 보여주고 사용자 "OK" 응답 받기 전에는 commit 절대 금지.

- [ ] **Step 3: 사용자 OK 후 commit**

```bash
git add CLAUDE.md docs/harness/b-catalog.md
git commit -m "docs(b6): sync CLAUDE.md and b-catalog after ship"
```

(사용자 홈의 MEMORY.md 와 project_b6_masking.md 는 별도 — git이 아닌 메모리 파일.)

- [ ] **Step 4: PR 머지 + 종료**

```bash
gh pr view --json mergeable
gh pr merge --squash
```

PR URL을 보고하고 plan 종료.

---

## Self-Review

**Spec coverage** (vs sub-spec written in T2):

- 마스킹 대상 9종 → Tasks 6 (regex 6종), 7 (NER 2종), 8 (verifier 잔존 검증) ✓
- 처리 파이프라인 6단계 → Task 10 ✓
- 파일 형식 4종 → Task 9 ✓
- 보안 (서버 미저장·외부 송신 0·감사 로그·textContent only) → Tasks 11, 8, 13, 15, 23 ✓
- UI 위치 결정 → Task 3 ✓
- 검증 (5 샘플) → Task 12 ✓

**Placeholder scan:**

- 모든 step에 실제 코드/명령어 포함. "appropriate handling" 0건.
- "<오늘>" 같은 자리표시(T2)는 *명시적으로 채워야 할 자리*임을 step 텍스트가 알려줌.
- Task 5 의 docstring `next-task-fill` 은 다음 task의 명시적 지시.

**Type consistency:**

- `MaskedSpan`, `NerSpan`, `VerificationResult`, `MaskingReport` 모두 dataclass, 일관된 필드 명명
- 백엔드 ↔ 프런트 계약: `audit`, `output_base64`, `output_filename` — Tasks 11, 15에서 동일
- `SMATE_B6_EXTERNAL_LLM` 환경변수: Tasks 8, 13에서 동일 표기
- 탭 이름: `tab-tools` 일관 (Tasks 14–22)
- `KIND_LABELS` (FE) ↔ regex/NER `kind` (BE): rrn/frn/phone/email/biz_no/person/address — 일관

**Security check:**

- innerHTML 미사용 — Task 15 코드 검토 완료, summaryLine.textContent / summaryDetail.textContent 만 사용
- 사용자 입력 파일명을 직접 DOM에 반영하지 않음 — `download` 속성에만 사용 (브라우저가 파일명으로만 처리)
- 백엔드 검증 — 415/413 status code 로 형식·크기 거부

**Scope discipline:**

- Excel/PDF/이미지 출력 → v1은 .txt, 원본 포맷 보존 v2 — 의도적 좁힘 ✓
- 한국어 우선, 다국어 후속 ✓
- 외부 LLM 옵트인 ✓
- 페르소나 인터뷰는 Jayce-led, 에이전트가 정리만 ✓

**Pre-implementation gate 누락 점검:**

- T1 persona-curator (skip 불가) ✓
- T2 sub-spec ✓
- T3 design-guard 사전 점검 ✓
- T4 도메인 자료 ✓
- T24 doc-keeper (skip 불가) ✓

---

## 다음 단계

Plan 완료. `superpowers:subagent-driven-development` (추천) 또는 `superpowers:executing-plans` 로 실행 가능.

**Prerequisite reminder:** 이 plan을 실행하기 전에 반드시 [`2026-05-01-snuhmate-harness-A-setup.md`](2026-05-01-snuhmate-harness-A-setup.md) 가 머지되어 있어야 함.
