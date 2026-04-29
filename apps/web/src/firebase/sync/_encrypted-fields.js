// firebase/sync/_encrypted-fields.js — 암호화 화이트리스트 (SPEC §18.2)
//
// 키: Firestore doc 의 collection path 패턴
// 값: 암호화할 필드 경로 배열 (단일 'name' 또는 nested 'entries[].field')
//
// 평문 유지 (인덱스/쿼리 가능):
//   - payMonth, payDate, lastEditAt, firestoreId, createdAt
//   - payslipName (카테고리 분류용, 식별 X)
//   - entries[].date, entries[].yyyymm
//   - category, type
//
// 암호화: 식별 정보 + 급여 정보 + 시간/일수 + 메모

export const ENCRYPTED_FIELDS = {
  // Profile (identity ↔ payroll 분리 — SPEC §3.4)
  'profile/identity': [
    'name', 'employeeId', 'department', 'position', 'hireDate', 'jobLevel', 'rank',
  ],
  'profile/payroll': [
    'hourlyWage', 'annualSalary', 'manualHourly', 'allowancePolicy', 'paymentDay', 'baseHours',
  ],
  // Payslips — parsedFields 전체 (PDF 파싱 항목별 금액)
  'payslips/*': ['parsedFields'],
  // Overtime — entries 의 hours/duration/notes (date/type 은 평문)
  'overtime/*': ['entries[].hours', 'entries[].duration', 'entries[].notes'],
  // Leave — entries 의 duration/notes (date 평문)
  'leave/*': ['entries[].duration', 'entries[].notes'],
  // Schedule — entries 의 duty/memo (date 평문, 팀원 이름은 평문)
  'schedule/*': ['entries[].duty', 'entries[].memo'],
  // Settings — appLockPin, customNotes (theme 등 일반 설정 평문)
  'settings/app': ['appLockPin', 'customNotes'],
  // Reference favorites — items 자체는 ID 배열이라 평문 OK (식별성 X)
  'settings/reference': [],
  // Work history — dept/role/desc (실제 스키마 필드명, workplace/from/to/source 평문)
  'work_history/*': ['dept', 'role', 'desc'],
};

// path 와 wildcard 패턴 매칭
// 예: 'profile/identity' (정확 일치) / 'overtime/*' (overtime/{anything})
export function fieldsForPath(path) {
  // 정확 일치 우선
  if (ENCRYPTED_FIELDS[path]) return ENCRYPTED_FIELDS[path];
  // wildcard 매칭
  for (const [pattern, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    if (!pattern.endsWith('/*')) continue;
    const prefix = pattern.slice(0, -2);  // 'overtime/*' → 'overtime'
    // path 가 prefix/<segment> 형태인지 확인
    if (path.startsWith(prefix + '/')) {
      const remainder = path.slice(prefix.length + 1);
      if (!remainder.includes('/')) return fields;  // 정확히 1 segment 만 추가
    }
  }
  return [];  // 매칭 없음 — 암호화 안 함
}

// users/{uid}/<collection-path> 형태에서 collection-path 추출
// 'users/abc/profile/identity' → 'profile/identity'
// 'users/abc/payslips/p1' → 'payslips/p1' (이후 fieldsForPath 가 'payslips/*' wildcard 매칭)
export function pathFromFullPath(fullPath) {
  const parts = fullPath.split('/');
  if (parts.length < 4 || parts[0] !== 'users') return null;
  return parts.slice(2).join('/');  // 'users/{uid}/' 제거
}
