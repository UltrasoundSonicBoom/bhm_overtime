#!/bin/bash
FILE_PATH="$1"
LOG="$CLAUDE_PROJECT_DIR/.claude/review-session-files.txt"
[ -n "$FILE_PATH" ] && echo "$FILE_PATH" >> "$LOG"
