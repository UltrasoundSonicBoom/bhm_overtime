// firebase/sync/profile-sync.js — Phase 8 Task 6 identity/payroll Firestore sync
//
// SPEC §3.4 + §18.2 — snuhmate_hr_profile 의 필드를 두 그룹으로 분리:
//   - identity: 이름/사번/부서/직급 등 (사용자 식별)
//   - payroll: 시급/연봉/수당 정책 등 (급여 정보)
// localStorage 는 합쳐진 shape 그대로 (UI 영향 0), Firestore 는 분리 저장 + 민감 필드 암호화.
//
// 평문 (인덱싱 가능): lastEditAt 만
// 암호화: 이름/사번/부서/시급/연봉 등 모든 필드 (`_encrypted-fields.js` 의 화이트리스트)
//
// dbOrNull = null 이면 production Firebase, 객체면 mock (테스트용)

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { deriveKey, encryptDoc, decryptDoc } from '../crypto.js';
import { ENCRYPTED_FIELDS } from './_encrypted-fields.js';

const IDENTITY_FIELDS = [
  'name', 'employeeId', 'department', 'position', 'hireDate',
  'employeeNumber', 'jobType', 'grade', 'year',
  'jobLevel', 'rank', 'workHistorySeeded',
];
const PAYROLL_FIELDS = [
  'hourlyWage', 'annualSalary', 'allowancePolicy', 'manualHourly',
  'paymentDay', 'baseHours', 'weeklyHours', 'paymentType',
];

export function _splitFields(profile) {
  if (!profile || typeof profile !== 'object') return { identity: {}, payroll: {} };
  const identity = {};
  const payroll = {};
  for (const [k, v] of Object.entries(profile)) {
    if (IDENTITY_FIELDS.includes(k)) identity[k] = v;
    else if (PAYROLL_FIELDS.includes(k)) payroll[k] = v;
    else identity[k] = v;  // 알려지지 않은 필드 → identity 보존
  }
  return { identity, payroll };
}

export function _mergeFields(identity, payroll) {
  const out = { ...(identity || {}), ...(payroll || {}) };
  delete out.lastEditAt;
  return out;
}

export async function writeProfile(dbOrNull, uid, profile) {
  const key = await deriveKey(uid);
  const { identity, payroll } = _splitFields(profile);
  const ts = Date.now();

  const idEncrypted = await encryptDoc(
    { ...identity, lastEditAt: ts },
    ENCRYPTED_FIELDS['profile/identity'],
    key
  );
  const pyEncrypted = await encryptDoc(
    { ...payroll, lastEditAt: ts },
    ENCRYPTED_FIELDS['profile/payroll'],
    key
  );

  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const idRef = firestoreMod.doc(db, `users/${uid}/profile/identity`);
  const pyRef = firestoreMod.doc(db, `users/${uid}/profile/payroll`);
  await Promise.all([
    firestoreMod.setDoc(idRef, idEncrypted, { merge: true }),
    firestoreMod.setDoc(pyRef, pyEncrypted, { merge: true }),
  ]);
}

export async function readProfile(dbOrNull, uid) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();
  const idRef = firestoreMod.doc(db, `users/${uid}/profile/identity`);
  const pyRef = firestoreMod.doc(db, `users/${uid}/profile/payroll`);
  const [idSnap, pySnap] = await Promise.all([
    firestoreMod.getDoc(idRef),
    firestoreMod.getDoc(pyRef),
  ]);
  const idRaw = idSnap.exists() ? idSnap.data() : null;
  const pyRaw = pySnap.exists() ? pySnap.data() : null;
  if (!idRaw && !pyRaw) return null;

  const idDec = idRaw ? await decryptDoc(idRaw, ENCRYPTED_FIELDS['profile/identity'], key) : {};
  const pyDec = pyRaw ? await decryptDoc(pyRaw, ENCRYPTED_FIELDS['profile/payroll'], key) : {};
  const merged = _mergeFields(idDec, pyDec);
  return Object.keys(merged).length > 0 ? merged : null;
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}

// 테스트용 mock Firestore mod (in-memory store with _writeDoc / _readDoc)
function _mockMod() {
  return {
    doc: (db, path) => ({ _db: db, _path: path }),
    setDoc: async (ref, data, options) => {
      ref._db._writeDoc(ref._path, data, options?.merge);
    },
    getDoc: async (ref) => {
      const data = ref._db._readDoc(ref._path);
      return { exists: () => data !== null, data: () => data };
    },
  };
}
