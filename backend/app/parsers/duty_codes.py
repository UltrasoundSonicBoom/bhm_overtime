"""듀티 코드 매핑 — 클라이언트 duty-code-mapper.js의 Python 미러.

같은 매핑 규칙을 백엔드에서도 동일하게 적용 → 일관성 보장.
"""
import re
from typing import Optional

STANDARD_CODES = ("D", "E", "N", "O", "AL", "RD")

EXACT_MAP: dict[str, str] = {
    # 영문 1글자
    "d": "D", "e": "E", "n": "N", "o": "O",
    # 한국어 1글자
    "데": "D", "이": "E", "나": "N", "오": "O",
    # 한국어 풀 명칭
    "데이": "D", "데이근무": "D", "주간": "D", "주간근무": "D",
    "이브닝": "E", "이브닝근무": "E", "저녁": "E", "석": "E", "석간": "E",
    "나이트": "N", "나이트근무": "N", "야간": "N", "야": "N", "야간근무": "N",
    "오프": "O", "휴": "O", "휴무": "O", "휴일": "O", "off": "O", "rest": "O",
    "al": "AL", "연차": "AL", "연": "AL", "연차휴가": "AL",
    "annual": "AL", "leave": "AL",
    "rd": "RD", "리커버리": "RD", "리커버리데이": "RD",
    "recovery": "RD", "recoveryday": "RD", "r": "RD",
}

EMPTY_TOKENS = {"", "-", "–", "—", "·", ".", "x", "X", "없음", "none"}

KEYWORDS = (
    ("리커버리", "RD"), ("recovery", "RD"),
    ("연차", "AL"), ("annual", "AL"),
    ("데이", "D"), ("주간", "D"), ("day", "D"),
    ("이브닝", "E"), ("저녁", "E"), ("evening", "E"),
    ("나이트", "N"), ("야간", "N"), ("night", "N"),
    ("오프", "O"), ("휴무", "O"), ("off", "O"),
)

EMOJI_RE = re.compile(r"[\U0001F300-\U0001FAFF☀-➿]")


def map_duty_code(raw: Optional[str]) -> str:
    """자유 형식 문자열 → 표준 듀티 코드."""
    if raw is None:
        return ""
    s = str(raw).strip()
    if s in EMPTY_TOKENS:
        return ""

    normalized = EMOJI_RE.sub("", s)
    normalized = re.sub(r"\s+", "", normalized).lower()

    if normalized in EMPTY_TOKENS:
        return ""
    if normalized in EXACT_MAP:
        return EXACT_MAP[normalized]

    # 부분 매칭
    for kw, code in KEYWORDS:
        if kw in normalized:
            return code

    return ""


def map_duty_confidence(raw: Optional[str]) -> float:
    """매핑 신뢰도. 정확=1.0, 부분=0.7, 실패=0.0, 빈셀=1.0."""
    if raw is None:
        return 1.0
    s = str(raw).strip()
    if s in EMPTY_TOKENS:
        return 1.0

    normalized = EMOJI_RE.sub("", s)
    normalized = re.sub(r"\s+", "", normalized).lower()

    if normalized in EMPTY_TOKENS:
        return 1.0
    if normalized in EXACT_MAP:
        return 1.0
    if map_duty_code(raw):
        return 0.7
    return 0.0
