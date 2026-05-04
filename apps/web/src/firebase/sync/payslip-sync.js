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

// ── Real-time subscription (Task 6) ──
// Firestore onSnapshot listener for collection users/{uid}/payslips.
// Returns an unsubscribe function (Firestore SDK convention).
// Skips snapshots from local pending writes to prevent echo loops.
function _payslipLocalKey(uid, payMonth, type) {
  if (!uid || !payMonth) return null;
  const ymKey = String(payMonth).replace('-', '_');
  return type && type !== '급여'
    ? `payslip_${uid}_${ymKey}_${type}`
    : `payslip_${uid}_${ymKey}`;
}

export async function subscribeToPayslipsRealtime(uid, onChange) {
  if (!uid) return () => {};
  const { db, firestoreMod } = await _f();
  const key = await deriveKey(uid);
  const col = firestoreMod.collection(db, COLLECTION(uid));
  const unsub = firestoreMod.onSnapshot(col, async (snap) => {
    // Skip echoes from local writes (we already updated localStorage write-side)
    if (snap.metadata && snap.metadata.hasPendingWrites) return;
    let mutated = false;
    const changes = typeof snap.docChanges === 'function' ? snap.docChanges() : [];
    for (const change of changes) {
      try {
        if (change.type === 'removed') {
          const fallback = _decodeDocId(change.doc.id);
          const lsKey = _payslipLocalKey(uid, fallback.payMonth, fallback.type);
          if (lsKey && localStorage.getItem(lsKey) !== null) {
            localStorage.removeItem(lsKey);
            mutated = true;
          }
          continue;
        }
        const dec = await decryptDoc(change.doc.data(), ENC_FIELDS, key);
        const { parsedFields, lastEditAt, ...meta } = dec;
        const fallback = _decodeDocId(change.doc.id);
        const payMonth = meta.payMonth || fallback.payMonth;
        const type = meta.type || fallback.type || '급여';
        const lsKey = _payslipLocalKey(uid, payMonth, type);
        if (!lsKey) continue;
        const value = JSON.stringify({ ...(parsedFields || {}), payMonth, type });
        if (localStorage.getItem(lsKey) !== value) {
          localStorage.setItem(lsKey, value);
          mutated = true;
        }
      } catch (e) {
        console.warn('[payslip-sync] onSnapshot decode failed', e?.message);
      }
    }
    if (mutated) {
      try {
        window.dispatchEvent(new CustomEvent('payslipChanged', { detail: { source: 'snapshot' } }));
      } catch { /* noop */ }
    }
    if (onChange) {
      try { onChange(snap); } catch { /* noop */ }
    }
  }, (err) => {
    console.warn('[payslip-sync] onSnapshot error', err?.message);
  });
  return unsub;
}
