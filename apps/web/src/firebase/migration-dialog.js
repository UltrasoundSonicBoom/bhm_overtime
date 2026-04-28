// firebase/migration-dialog.js — Phase 8 Task 8 placeholder
//
// Phase 5 의 auth-service.js 가 dynamic import 로 참조 (onAuthChanged 콜백 안).
// 실제 마이그레이션 다이얼로그 로직은 Phase 8 (Task 8) 에서 작성 — 카테고리별 동의 UI.
//
// 현재 상태: stub. shouldShowMigration 이 항상 false 반환 → 다이얼로그 트리거 안 됨.
// auth-service 의 try/catch 와 결합해서 Phase 8 미완 시점에도 무해 동작 보장.

export async function shouldShowMigration(/* uid */) {
  return false;  // Phase 8 에서 실제 검사 (게스트 데이터 존재 여부 + flag 체크)
}

export async function openMigrationDialog(/* uid */) {
  // Phase 8 에서 카테고리별 동의 다이얼로그 마운트
}
