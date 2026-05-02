// firebase/sync/mock-firestore.js
//
// In-memory Firestore adapter used by sync module tests. Production paths still
// use firebase-init.js and the real Firebase SDK.

export function mockFirestoreMod() {
  return {
    doc: (db, path) => ({ _db: db, _path: path }),
    collection: (db, path) => ({ _db: db, _path: path }),
    setDoc: async (ref, data, options) => {
      ref._db._writeDoc(ref._path, data, !!options?.merge);
    },
    getDoc: async (ref) => {
      const data = ref._db._readDoc(ref._path);
      return { exists: () => data !== null, data: () => data };
    },
    getDocs: async (col) => {
      const docs = col._db._queryCollection(col._path);
      return { empty: docs.length === 0, docs };
    },
    deleteDoc: async (ref) => {
      ref._db._deleteDoc(ref._path);
    },
  };
}
