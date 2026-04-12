# Spec: C1 -- Google Drive Integration

## Goal

Google Drive API 연동으로 사용자 데이터(급여 계산 결과, 시간외 기록)를 Google Drive appDataFolder에 백업.

## Design Principles

- "Drive에 저장" 버튼 클릭 시에만 Google Drive API 호출
- 자동 동기화 없음 (사용자 명시적 opt-in)
- Google login 사용자에게만 버튼 노출
- `drive.appdata` scope 사용 (appDataFolder만 접근)
- 저장 데이터: 급여 계산 결과, 시간외 기록, 휴가 기록, 프로필

## Implementation (googleDriveStore.js)

### API
- `GoogleDriveStore.readJsonFile(name)` -- Drive에서 JSON 파일 읽기
- `GoogleDriveStore.writeJsonFile(name, data)` -- Drive에 JSON 파일 쓰기
- `GoogleDriveStore.uploadPdf(name, blob)` -- Drive에 PDF 업로드
- `GoogleDriveStore.deleteFile(name)` -- Drive에서 파일 삭제

### UI (index.html)
- googleBackupSection: Drive 백업 토글 및 수동 동기화 버튼
- Google login 상태에서만 표시 (display:none -> block)
- driveBackupToggle: 백업 활성화/비활성화

## Files
- googleDriveStore.js
- index.html (Google Drive 백업 섹션)
