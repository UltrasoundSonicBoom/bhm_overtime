// firebase/sync/payslip-sync.js — Phase 8 Task 7 급여명세서 Firestore sync
//
// collection-by-id: users/{uid}/payslips/{payslipId}
// 암호화: parsedFields (PDF 파싱 항목별 금액 전체)
//
// localStorage 스키마 (OVERTIME.PAYSLIP_STORAGE_KEY = overtimePayslipData):
//   { 'YYYY-MM': { workStats, overtimeItems, hourlyRate, savedAt } }
// Firestore 스키마 (per doc):
//   { parsedFields: { workStats, overtimeItems, hourlyRate }, payMonth: 'YYYY-MM', lastEditAt }

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { deriveKey, encryptDoc, decryptDoc } from '../crypto.js';
import { ENCRYPTED_FIELDS } from './_encrypted-fields.js';
import { mockFirestoreMod } from './mock-firestore.js';

const COLLECTION = (uid) => `users/${uid}/payslips`;
const ENC_FIELDS = ENCRYPTED_FIELDS['payslips/*'];

function _docId(payMonth, type) {
  if (!type || type === '급여') return payMonth;
  return `${payMonth}__${encodeURIComponent(type)}`;
}

function _decodeDocId(id) {
  const [payMonth, encodedType] = String(id || '').split('__');
  return {
    payMonth,
    type: encodedType ? (() => { try { return decodeURIComponent(encodedType); } catch { return encodedType; } })() : '급여',
  };
}

export async function writePayslip(dbOrNull, uid, payMonth, data, driveFileId, type = '급여') {
  // payMonth: 'YYYY-MM', data: { workStats, overtimeItems, hourlyRate, ... }
  // driveFileId: optional — Google Drive 파일 ID (Phase 9)
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const normalizedType = type || data?.type || '급여';
  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${_docId(payMonth, normalizedType)}`);

  let existingFields = {};
  try {
    const snap = await firestoreMod.getDoc(ref);
    if (snap.exists()) {
      const prev = await decryptDoc(snap.data(), ENC_FIELDS, key);
      existingFields = prev.parsedFields || {};
    }
  } catch (_e) {
    existingFields = {};
  }

  const { savedAt, payMonth: _payMonth, type: _type, ...rest } = data || {};
  const docData = {
    parsedFields: { ...existingFields, ...rest },
    payMonth,
    type: normalizedType,
    lastEditAt: Date.now(),
  };
  if (driveFileId) docData.driveFileId = driveFileId;  // 평문 — 식별성 없음
  const encrypted = await encryptDoc(docData, ENC_FIELDS, key);
  await firestoreMod.setDoc(ref, encrypted);
}

export async function writeAllPayslips(dbOrNull, uid, allData, defaultType = '급여') {
  // allData: { 'YYYY-MM': payslipData }
  const entries = Object.entries(allData || {});
  if (entries.length === 0) return;
  await Promise.all(entries.map(([entryKey, data]) => {
    const payMonth = data?.payMonth || entryKey.split('__')[0];
    const type = data?.type || (entryKey.includes('__') ? entryKey.split('__').slice(1).join('__') : defaultType);
    return writePayslip(dbOrNull, uid, payMonth, data, undefined, type);
  }));
}

export async function readPayslip(dbOrNull, uid, payMonth, type = '급여') {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${_docId(payMonth, type)}`);
  const snap = await firestoreMod.getDoc(ref);
  if (!snap.exists()) return null;

  const dec = await decryptDoc(snap.data(), ENC_FIELDS, key);
  const { parsedFields, lastEditAt, ...meta } = dec;
  return { ...(parsedFields || {}), payMonth: meta.payMonth || payMonth, type: meta.type || type || '급여' };
}

export async function deletePayslip(dbOrNull, uid, payMonth, type = '급여') {
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${_docId(payMonth, type)}`);
  await firestoreMod.deleteDoc(ref);
}

export async function readAllPayslips(dbOrNull, uid) {
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
    const { parsedFields, lastEditAt, ...meta } = dec;
    const fallback = _decodeDocId(d.id || d._path.split('/').pop());
    const payMonth = meta.payMonth || fallback.payMonth;
    const type = meta.type || fallback.type || '급여';
    const resultKey = type && type !== '급여' ? `${payMonth}__${type}` : payMonth;
    result[resultKey] = { ...(parsedFields || {}), payMonth, type };
  }));
  return result;
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}
