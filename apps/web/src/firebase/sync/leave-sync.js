// firebase/sync/leave-sync.js — Phase 8 Task 7 휴가 기록 Firestore sync
//
// collection-by-yyyy: users/{uid}/leave/{year}
// 암호화: entries[].duration, entries[].notes
//
// localStorage 스키마 (LEAVE):
//   { 'YYYY': [{ id, startDate, endDate, type, days, hours, notes, salaryImpact, ... }] }
// Firestore 스키마 (per doc):
//   { entries: [{ ...record, duration }], lastEditAt }
// 매핑: days → duration (일수 표기 문자열)

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { deriveKey, encryptDoc, decryptDoc } from '../crypto.js';
import { ENCRYPTED_FIELDS } from './_encrypted-fields.js';
import { mockFirestoreMod } from './mock-firestore.js';

const COLLECTION = (uid) => `users/${uid}/leave`;
const ENC_FIELDS = ENCRYPTED_FIELDS['leave/*'];

function _toFirestore(records) {
  return (records || []).map((r) => ({
    ...r,
    duration: r.days != null ? `${r.days}d` : (r.hours != null ? `${r.hours}h` : ''),
    notes: r.notes || '',
  }));
}

function _fromFirestore(entries) {
  return (entries || []).map((e) => {
    const { duration, ...rest } = e;
    return rest;
  });
}

export async function writeLeaveYear(dbOrNull, uid, year, records) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const entries = _toFirestore(records);
  const docData = { entries, lastEditAt: Date.now() };
  const encrypted = await encryptDoc(docData, ENC_FIELDS, key);
  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${String(year)}`);
  await firestoreMod.setDoc(ref, encrypted);
}

export async function writeAllLeave(dbOrNull, uid, allData) {
  // allData: { 'YYYY': [records...] }
  const entries = Object.entries(allData || {});
  if (entries.length === 0) return;
  await Promise.all(entries.map(([year, records]) =>
    writeLeaveYear(dbOrNull, uid, year, records)
  ));
}

export async function readLeaveYear(dbOrNull, uid, year) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${String(year)}`);
  const snap = await firestoreMod.getDoc(ref);
  if (!snap.exists()) return [];

  const dec = await decryptDoc(snap.data(), ENC_FIELDS, key);
  return _fromFirestore(dec.entries);
}

export async function readAllLeave(dbOrNull, uid) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const col = firestoreMod.collection(db, COLLECTION(uid));
  const snap = await firestoreMod.getDocs(col);
  if (snap.empty) return {};

  const result = {};
  await Promise.all(snap.docs.map(async (d) => {
    const dec = await decryptDoc(d.data(), ENC_FIELDS, key);
    const year = d.id || d._path.split('/').pop();
    result[year] = _fromFirestore(dec.entries);
  }));
  return result;
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}
