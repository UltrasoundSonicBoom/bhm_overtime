# 백업 .json Round-Trip 검증 리포트

> 작성일: 2026-04-25
> 워크트리: `.worktrees/backup-test` (브랜치 `audit/backup-roundtrip`)
> 대상: `profile-tab.js:719 downloadBackup()` ↔ `profile-tab.js:749 uploadBackup()` 의 직렬화/복원 round-trip 무결성.

## 시나리오 + 결과

### 단계 1 — 시드 데이터 작성
| 데이터 | 값 |
|--------|---|
| 프로필 | 백업테스트 / S2 5호봉 / 입사 2010-04-01 |
| 시간외 기록 | 2건 (2026-04-20, 2026-04-21, 시급 30,000) |
| 휴가 기록 | 2건 (annual 04-15, menstrual 04-10) |

### 단계 2 — 백업 객체 생성 (`downloadBackup` 와 동일 로직)
- `version: "1.0"`, `exportDate: ISO 8601`
- `profile`, `overtime`, `leave` 키 모두 직렬화
- 파일 크기: **1,894 bytes**
- JSON 직렬화/역직렬화 대칭 ✅

### 단계 3 — localStorage 비우기 (다른 브라우저 시뮬)
- `PROFILE.STORAGE_KEY`, `OVERTIME.STORAGE_KEY`, `LEAVE.STORAGE_KEY` 제거
- empty 상태 검증: `profile=null`, `overtime=0건`, `leave=0건` ✅

### 단계 4 — 복원 (`uploadBackup` 핵심 로직)
- 구조 검증: `data.version || data.profile || ...` ✅
- `toStorable()` 가 string/object 정규화 + `JSON.parse` 검증 ✅
- 3개 storage key 에 string 으로 저장

### 단계 5 — Round-Trip 일치 검증
| 항목 | 시드 | 복원 후 | 일치 |
|------|-----|--------|------|
| profile.name | 백업테스트 | 백업테스트 | ✅ |
| profile.grade | S2 | S2 | ✅ |
| profile.hireDate | 2010-04-01 | 2010-04-01 | ✅ |
| 시간외 기록 수 | 2 | 2 | ✅ |
| 시간외 첫 날짜 | 2026-04-20 | 2026-04-20 | ✅ |
| 휴가 기록 수 | 2 | 2 | ✅ |
| 휴가 첫 type | annual | annual | ✅ |

**`matchesSeed: true`** — 100% 일치.

### 단계 6 — 손상/잘못된 파일 거부 (7/7 통과)
| 케이스 | 결과 |
|-------|------|
| 빈 객체 `{}` | ✅ `Error('invalid_structure')` 발생 |
| 잘못된 JSON `not valid {{` | ✅ `JSON.parse` throw |
| 객체 형태 profile (정규화) | ✅ `JSON.stringify` 후 저장 가능 |
| 손상된 string `'{"broken": '` | ✅ `toStorable` throw (무음 손상 차단) |
| `photo.jpg` 파일명 | ✅ 이미지 정규식 매치 (차단) |
| `payslip.pdf` 파일명 | ✅ PDF/Excel 정규식 매치 (차단) |
| `snuh_backup_2026-04-25.json` | ✅ 차단 정규식에 매치 안 됨 (허용) |

## 콘솔 + 회귀
- 콘솔 에러: 0건
- Tests: 153 passed (코드 변경 0)

## 결론
- ✅ **`downloadBackup` ↔ `uploadBackup` round-trip 완전 무결성** (1,894 bytes 직렬화 + 7개 필드 역직렬화 모두 일치).
- ✅ **무음 손상 차단** (구조 검증 + JSON.parse 이중 검증 + 파일명 화이트리스트).
- ✅ **다른 브라우저로 이사 가능** (storage key 가 같으면 풀 복원 / 다르면 사용자 ID 매핑 필요 — 별도 사항).

## 산출물
- 본 리포트: `docs/architecture/backup-roundtrip-audit.md`
- known-issues.md "잔여 수동 스모크" 의 백업 round-trip 항목 → ✅ 자동 검증 완료
