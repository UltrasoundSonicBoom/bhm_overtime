// firebase/sync/settings-sync.js — Phase 8 Task 7 설정 Firestore sync
//
// doc: users/{uid}/settings/app
// 암호화: appLockPin, customNotes (theme 등 일반 설정 평문)
//
// otManualHourly 처리:
//   KEY_REGISTRY 에서 users/{uid}/profile/payroll 로 doc-merge (fieldName: manualHourly)
//   → writeManualHourly() 가 payroll doc 에 병합

import { initFirebase } from "../firebase-init.js";
import { firebaseConfig } from "../../client/config.js";
import { deriveKey, encryptDoc, decryptDoc } from "../crypto.js";
import { ENCRYPTED_FIELDS } from "./_encrypted-fields.js";
import { stripDeviceLocalSettings } from "../sync-lifecycle.js";
import { mockFirestoreMod } from "./mock-firestore.js";

const SETTINGS_PATH = (uid) => `users/${uid}/settings/app`;
const PAYROLL_PATH = (uid) => `users/${uid}/profile/payroll`;
const ENC_FIELDS = ENCRYPTED_FIELDS["settings/app"];

export async function writeSettings(dbOrNull, uid, settings) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const docData = {
    ...stripDeviceLocalSettings(settings),
    lastEditAt: Date.now(),
  };
  const encrypted = await encryptDoc(docData, ENC_FIELDS, key);
  const ref = firestoreMod.doc(db, SETTINGS_PATH(uid));
  await firestoreMod.setDoc(ref, encrypted, { merge: true });
}

export async function readSettings(dbOrNull, uid) {
  const key = await deriveKey(uid);
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  const ref = firestoreMod.doc(db, SETTINGS_PATH(uid));
  const snap = await firestoreMod.getDoc(ref);
  if (!snap.exists()) return null;

  const dec = await decryptDoc(snap.data(), ENC_FIELDS, key);
  delete dec.lastEditAt;
  return dec;
}

export async function writeManualHourly(dbOrNull, uid, value) {
  const key = await deriveKey(uid);
  const payrollEncFields = ENCRYPTED_FIELDS["profile/payroll"];
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: mockFirestoreMod() }
    : await _f();

  // doc-merge: manualHourly 단일 필드를 payroll doc 에 병합
  const docData = { manualHourly: value, lastEditAt: Date.now() };
  const encrypted = await encryptDoc(docData, payrollEncFields, key);
  const ref = firestoreMod.doc(db, PAYROLL_PATH(uid));
  await firestoreMod.setDoc(ref, encrypted, { merge: true });
}

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return { db: _firebase.db, firestoreMod: _firebase.firestoreMod };
}
