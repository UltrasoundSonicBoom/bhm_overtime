// firebase/sync/work-history-sync.js — Phase 8 Task 7 근무이력 Firestore sync
//
// collection-by-id: 각 entry → users/{uid}/work_history/{entryId}
// 암호화: dept, role, desc (workplace/from/to/source 평문)

import { initFirebase } from '../firebase-init.js';
import { firebaseConfig } from '../../client/config.js';
import { deriveKey, encryptDoc, decryptDoc } from '../crypto.js';
import { ENCRYPTED_FIELDS } from './_encrypted-fields.js';

const COLLECTION = (uid) => `users/${uid}/work_history`;

export async function writeAllWorkHistory(dbOrNull, uid, entries) {
  if (!Array.isArray(entries) || entries.length === 0) return;
  const key = await deriveKey(uid);
  const encFields = ENCRYPTED_FIELDS['work_history/*'];
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  await Promise.all(entries.map(async (entry) => {
    if (!entry || !entry.id) return;
    const docData = { ...entry, lastEditAt: Date.now() };
    const encrypted = await encryptDoc(docData, encFields, key);
    const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${entry.id}`);
    await firestoreMod.setDoc(ref, encrypted);
  }));
}

export async function readAllWorkHistory(dbOrNull, uid) {
  const key = await deriveKey(uid);
  const encFields = ENCRYPTED_FIELDS['work_history/*'];
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();

  const col = firestoreMod.collection(db, COLLECTION(uid));
  const snap = await firestoreMod.getDocs(col);
  if (snap.empty) return [];

  const results = await Promise.all(snap.docs.map(async (d) => {
    const raw = d.data();
    const dec = await decryptDoc(raw, encFields, key);
    delete dec.lastEditAt;
    return dec;
  }));
  return results;
}

export async function deleteWorkHistoryEntry(dbOrNull, uid, entryId) {
  const { db, firestoreMod } = dbOrNull
    ? { db: dbOrNull, firestoreMod: _mockMod() }
    : await _f();
  const ref = firestoreMod.doc(db, `${COLLECTION(uid)}/${entryId}`);
  await firestoreMod.deleteDoc(ref);
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
    deleteDoc: async (ref) => { ref._db._deleteDoc(ref._path); },
  };
}
