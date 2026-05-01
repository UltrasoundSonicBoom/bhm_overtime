# SNUH Mate 근무표 파싱 백엔드

맥미니 M4 Pro에서 실행하는 로컬 파싱 서비스. 클라이언트가 업로드한 근무표(Excel/CSV/PDF/이미지)를 파싱·정규화·캐시한다.

## 스택
- **FastAPI** (:8001) — 파싱 디스패처
- **LM Studio** (:1234) — Vision/Text LLM 서빙 (OpenAI-compatible)
  - **Qwen3-VL 8B Q4_K_M** — 이미지 → 표 추출
  - **Gemma 4 E4B** — JSON 정규화/검증/리포트
- **openpyxl + pandas** — Excel 결정론적 파싱
- **SQLite** — 파싱 캐시 + 코퍼스 + 리뷰 큐

## 셋업 (맥미니 M4 Pro)

### 1. Python 환경
```bash
brew install python@3.11 poetry
cd backend
poetry install
```

### 2. LM Studio
1. https://lmstudio.ai/ 다운로드 → 설치
2. Models 탭에서 다음 다운로드:
   - `Qwen/Qwen3-VL-8B-Instruct-GGUF` Q4_K_M (약 5GB)
   - `google/gemma-2-2b-it-GGUF` Q4_K_M (Gemma 4 E4B 정식 출시 전 임시)
3. Developer 탭 → 두 모델 모두 로드 → "Start Server" (default :1234)
4. 모델 ID 메모: `qwen3-vl-8b`, `gemma-2-2b-it`

### 3. FastAPI 실행
```bash
cd backend
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 4. 헬스 체크
```bash
curl http://localhost:8001/health
# {"ok": true, "lm_studio": true, "models": ["qwen3-vl-8b", "gemma-2-2b-it"]}
```

### 5. 외부 접근 (선택 — 프로덕션 웹에서 호출)
- **Tailscale**: `tailscale up` → 맥미니 magic DNS 사용 (`http://m4pro.tail-scale.ts.net:8001`)
- **Cloudflare Tunnel**: `cloudflared tunnel --url http://localhost:8001`
- **로컬 LAN만 사용 시 추가 설정 불필요**

## 테스트
```bash
poetry run pytest
```

## 데이터 위치
- 캐시 + 코퍼스 + 리뷰: `~/.snuhmate-backend/data.db` (SQLite)

## Admin review auth

`GET /admin/reviews` and `POST /admin/reviews/{id}/status` require:

```bash
export SNUHMATE_ADMIN_TOKEN="replace-with-long-random-token"
curl -H "Authorization: Bearer $SNUHMATE_ADMIN_TOKEN" http://localhost:8001/admin/reviews
```

If `SNUHMATE_ADMIN_TOKEN` is not set, admin routes fail closed with HTTP 503.

## Corpus policy

`POST /corpus/submit` is the only supported corpus submission path. The backend validates the payload, removes direct identifiers and free-form raw text, and stores only the sanitized allowlisted fields in SQLite. Do not write `anonymous_corpus` as a top-level Firestore collection.

## API 엔드포인트
| Path | 설명 |
|------|------|
| `GET  /health` | LM Studio + SQLite ping 헬스체크 |
| `POST /parse/excel` | .xlsx/.xls → DutyGrid (multipart) |
| `POST /parse/csv` | CSV 텍스트 → DutyGrid |
| `GET  /cache/get?hash=...` | sha256 캐시 조회 |
| `POST /cache/put` | sha256 + DutyGrid JSON 검증 후 캐시 저장 |
| `GET  /cache/dept-month-status` | 부서·월 LLM 호출 카운터 조회 |
| `POST /cache/dept-month-increment` | 부서·월 LLM 호출 카운터 증가 |
| `POST /corpus/submit` | 익명화된 코퍼스 검증·정제 후 저장 |
| `GET  /admin/reviews` | admin bearer token 필요, confidence < 0.9 리뷰 큐 |
| `POST /admin/reviews/{id}/status` | admin bearer token 필요, 리뷰 상태 변경 |
