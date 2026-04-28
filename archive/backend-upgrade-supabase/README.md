# Archived: Supabase Schema (2026-04-28)

이 디렉토리는 SNUH 메이트가 Firebase/Firestore 로 이전하기 전 Supabase PostgreSQL 시기에 사용되던 스키마 파일을 보존합니다.

## 파일

- `schema.sql` — 구 Supabase PostgreSQL 스키마 (Phase 8 이전)

## 컨텍스트

- 2026년 초 Supabase 도입 시도 → 11일 만에 롤백 (2026-04 중반)
- Phase 8 (2026-04-28) 에서 **Firebase Auth + Cloud Firestore** 로 백엔드 확정
- 데이터 모델: `users/{uid}/<collection>` 구조 + AES-GCM 클라이언트측 암호화

이 파일은 더 이상 코드에서 참조되지 않으며 히스토리 보존 용도로만 남아있습니다.
