// firebase/sync/overtime-sync.js — Phase 8 Task 7 시간외 기록 Firestore sync
//
// collection-by-yyyymm: users/{uid}/overtime/{yyyymm}
// 암호화: entries[].hours, entries[].duration, entries[].notes (date/type 평문)
//
// localStorage 스키마 (OVERTIME.addRecord):
//   { 'YYYY-MM': [{ id, date, type, totalHours, memo, breakdown, estimatedPay, ... }] }
// Firestore 스키마 (per doc):
//   { entries: [{ id, date, type, hours, duration, notes, ...rest }], lastEditAt }
// 매핑: totalHours → hours, memo → notes, duration (formatted string)

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { deriveKey, encryptDoc, decryptDoc } from '../crypto.js';
import { ENCRYPTED_FIELDS } from './_encrypted-fields.js';

const COLLECTION = (uid) => `users/${uid}/overtime`;
const ENC_FIELDS = ENCRYPTED_FIELDS['overtime/*'];

function _toFirestore(records) {
  return (records || []).map((r) => {
    const { totalHours, memo, ...rest } = r;
    const hours = totalHours ?? 0;
    return {
      ...rest,
      hours,
      duration: `${Math.floor(hours)}h${Math.round((hours % 1) * 60).toString().padStart(2, '0')}m`,
      notes: memo || '',
    };
  });
}

function _fromFirestore(entries) {
  return (entries || []).map((e) => {
    const { hours, duration, notes, ...rest } = e;
    return { ...rest, totalHours: hours ?? 0, memo: notes || '' };
  });
}

export async function writeOvertimeMonth(dbOrNull, uid, yyyymm, records) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const entries = _toFirestore(records);
  const docData = { entries, lastEditAt: Date.now() };
  const encrypted = await encryptDoc(docData, ENC_FIELDS, key);
  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${yyyymm}`);
  await firestoreMod.setDoc(ref, encrypted);
}

export async function writeAllOvertime(dbOrNull, uid, allData) {
  // allData: { 'YYYY-MM': [records...] }
  const entries = Object.entries(allData || {});
  if (entries.length === 0) return;
  await Promise.all(entries.map(([yyyymm, records]) =>
    writeOvertimeMonth(dbOrNull, uid, yyyymm, records)
  ));
}

export async function readOvertimeMonth(dbOrNull, uid, yyyymm) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${yyyymm}`);
  const snap = await firestoreMod.getDoc(ref);
  if (!snap.exists()) return [];

  const dec = await decryptDoc(snap.data(), ENC_FIELDS, key);
  return _fromFirestore(dec.entries);
}

export async function readAllOvertime(dbOrNull, uid) {
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
    result[yyyymm] = _fromFirestore(dec.entries);
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
