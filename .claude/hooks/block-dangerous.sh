#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if echo "$COMMAND" | grep -qiE 'rm\s+-rf|drop\s+table|truncate\s+'; then
  echo '{"decision":"block","reason":"위험 명령 감지 (rm -rf / DROP TABLE / TRUNCATE). 수동으로 확인 후 직접 실행하세요."}'
  exit 0
fi
