#!/bin/bash
LOG="$CLAUDE_PROJECT_DIR/.claude/review-session-files.txt"

if [ ! -f "$LOG" ] || [ ! -s "$LOG" ]; then
  exit 0
fi

FILES=$(sort -u "$LOG" | head -20 | tr '\n' ' ')
rm -f "$LOG"

REVIEW_FLAG="$CLAUDE_PROJECT_DIR/.claude/.review-in-progress"
if [ -f "$REVIEW_FLAG" ]; then
  rm -f "$REVIEW_FLAG"
  exit 0
fi

touch "$REVIEW_FLAG"

cat <<EOF
{
  "decision": "block",
  "reason": "코드 리뷰를 실행합니다. Task 도구를 사용해 code-reviewer 서브에이전트를 소환하고, 다음 파일들을 리뷰하게 하세요: $FILES\n리뷰 결과를 읽고 Critical/Major 이슈가 있으면 수정 후 완료하세요."
}
EOF
