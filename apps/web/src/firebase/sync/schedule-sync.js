// firebase/sync/schedule-sync.js — 근무표 Firestore sync
//
// collection-by-yyyymm: users/{uid}/schedule/{yyyymm}
// 암호화: entries[].duty, entries[].memo (date 평문)
//
// localStorage 스키마 ('snuhmate_schedule_records'):
//   { 'YYYY-MM': {
//       mine: { 1: 'D', 2: 'E', ... },
//       team: { '김지원': { 1: 'D', ... }, ... },
//       lastEditAt?: number,
//       sourceFile?: string
//     } }
// Firestore 스키마 (per doc):
//   {
//     entries: [{ date: 'YYYY-MM-DD', duty: 'D', memo?: '' }, ...],   // mine 데이터를 entries로 변환
//     team: { '김지원': [{ date, duty }, ...], ... },                  // 팀 데이터 (팀원 이름은 평문)
//     lastEditAt: number,
//     sourceFile?: string
//   }

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { deriveKey, encryptDoc, decryptDoc } from '../crypto.js';
import { ENCRYPTED_FIELDS } from './_encrypted-fields.js';

const COLLECTION = (uid) => `users/${uid}/schedule`;
const ENC_FIELDS = ENCRYPTED_FIELDS['schedule/*'];

// localStorage 형태 → Firestore entries 배열로 변환
function _toFirestore(monthData, yyyymm) {
  const mine = monthData?.mine || {};
  const entries = Object.entries(mine).map(([day, duty]) => ({
    date: `${yyyymm}-${String(day).padStart(2, '0')}`,
    duty: String(duty || ''),
    memo: monthData?.memos?.[day] || '',
  }));

  // 팀 데이터: 이름별 entries 배열 (팀원 이름은 평문 유지)
  const teamRaw = monthData?.team || {};
  const team = {};
  for (const [name, dayMap] of Object.entries(teamRaw)) {
    team[name] = Object.entries(dayMap || {}).map(([day, duty]) => ({
      date: `${yyyymm}-${String(day).padStart(2, '0')}`,
      duty: String(duty || ''),
    }));
  }

  return {
    entries,
    team,
    lastEditAt: monthData?.lastEditAt || Date.now(),
    sourceFile: monthData?.sourceFile || '',
  };
}

// Firestore doc → localStorage 형태로 역변환
function _fromFirestore(doc, yyyymm) {
  const result = { mine: {}, team: {}, lastEditAt: doc.lastEditAt || 0, sourceFile: doc.sourceFile || '' };

  for (const e of doc.entries || []) {
    if (!e?.date) continue;
    const day = parseInt(e.date.split('-')[2], 10);
    if (Number.isFinite(day)) {
      result.mine[day] = e.duty || '';
    }
  }

  for (const [name, arr] of Object.entries(doc.team || {})) {
    result.team[name] = {};
    for (const e of arr || []) {
      if (!e?.date) continue;
      const day = parseInt(e.date.split('-')[2], 10);
      if (Number.isFinite(day)) {
        result.team[name][day] = e.duty || '';
      }
    }
  }

  return result;
}

export async function writeScheduleMonth(dbOrNull, uid, yyyymm, monthData) {
  if (!uid) return; // guest mode → noop
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const docData = _toFirestore(monthData, yyyymm);
  const encrypted = await encryptDoc(docData, ENC_FIELDS, key);
  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${yyyymm}`);
  await firestoreMod.setDoc(ref, encrypted);
}

export async function writeAllSchedule(dbOrNull, uid, allData) {
  if (!uid) return;
  const entries = Object.entries(allData || {});
  if (entries.length === 0) return;
  await Promise.all(entries.map(([yyyymm, monthData]) =>
    writeScheduleMonth(dbOrNull, uid, yyyymm, monthData)
  ));
}

export async function readScheduleMonth(dbOrNull, uid, yyyymm) {
  if (!uid) return null;
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${yyyymm}`);
  const snap = await firestoreMod.getDoc(ref);
  if (!snap.exists()) return null;

  const dec = await decryptDoc(snap.data(), ENC_FIELDS, key);
  return _fromFirestore(dec, yyyymm);
}

export async function readAllSchedule(dbOrNull, uid) {
  if (!uid) return {};
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const col = firestoreMod.collection(db, COLLECTION(uid));
  const snap = await firestoreMod.getDocs(col);
  if (snap.empty) return {};

  const result = {};
  await Promise.all(snap.docs.map(async (d) => {
    const dec = await decryptDoc(d.data(), ENC_FIELDS, key);
    const yyyymm = d.id || d._path.split('/').pop();
    result[yyyymm] = _fromFirestore(dec, yyyymm);
  }));
  return result;
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}

function _mockMod() {
  return {
    doc: (db, path) => ({ _db: db, _path: path }),
    collection: (db, path) => ({ _db: db, _path: path }),
    setDoc: async (ref, data) => { ref._db._writeDoc(ref._path, data, false); },
    getDoc: async (ref) => {
      const data = ref._db._readDoc(ref._path);
      return { exists: () => data !== null, data: () => data };
    },
    getDocs: async (col) => {
      const docs = col._db._queryCollection(col._path);
      return { empty: docs.length === 0, docs };
    },
  };
}
