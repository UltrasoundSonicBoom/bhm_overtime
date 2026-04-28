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

const COLLECTION = (uid) => `users/${uid}/payslips`;
const ENC_FIELDS = ENCRYPTED_FIELDS['payslips/*'];

export async function writePayslip(dbOrNull, uid, payMonth, data, driveFileId) {
  // payMonth: 'YYYY-MM', data: { workStats, overtimeItems, hourlyRate, ... }
  // driveFileId: optional — Google Drive 파일 ID (Phase 9)
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const { savedAt, ...rest } = data || {};
  const docData = { parsedFields: rest, payMonth, lastEditAt: Date.now() };
  if (driveFileId) docData.driveFileId = driveFileId;  // 평문 — 식별성 없음
  const encrypted = await encryptDoc(docData, ENC_FIELDS, key);
  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${payMonth}`);
  await firestoreMod.setDoc(ref, encrypted);
}

export async function writeAllPayslips(dbOrNull, uid, allData) {
  // allData: { 'YYYY-MM': payslipData }
  const entries = Object.entries(allData || {});
  if (entries.length === 0) return;
  await Promise.all(entries.map(([payMonth, data]) =>
    writePayslip(dbOrNull, uid, payMonth, data)
  ));
}

export async function readPayslip(dbOrNull, uid, payMonth) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${payMonth}`);
  const snap = await firestoreMod.getDoc(ref);
  if (!snap.exists()) return null;

  const dec = await decryptDoc(snap.data(), ENC_FIELDS, key);
  const { parsedFields, lastEditAt, ...meta } = dec;
  return { ...(parsedFields || {}), payMonth: meta.payMonth || payMonth };
}

export async function readAllPayslips(dbOrNull, uid) {
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
    const { parsedFields, lastEditAt, ...meta } = dec;
    const payMonth = meta.payMonth || d.id || d._path.split('/').pop();
    result[payMonth] = parsedFields || {};
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
