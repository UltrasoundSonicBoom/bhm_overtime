# LM Studio 게이트웨이 — 보관용

momo-auto-macmini의 LM Studio (qwen3-vl-4b + gemma-4-e4b)로 payslip/schedule을 파싱하던 서버 코드.

당분간 OpenAI Vision API로 대체하기 때문에 활성 경로에서 분리해 보관한다.
qwen3-vl-4b thinking-token JSON 깨짐 문제가 해결되거나 더 큰 vision 모델로 옮길 때 다시 가져온다.

## 다시 살리려면
1. 이 디렉토리의 `lmstudio_gateway.py`, `lmstudio_schemas.py`를 `server/`로 이동
2. `server/.env` 복원 (Tailscale URL + 토큰)
3. `apps/web/src/client/schedule-parser/ai-providers/_archive/vision-router.lmstudio.js`를
   `vision-router.js`로 덮어쓰기
4. `momo-auto-macmini`에서 `uvicorn lmstudio_gateway:app --host 0.0.0.0 --port 3001`

자세한 디버그 기록: `~/.claude/projects/.../memory/project_payslip_api_debug.md`
