---
paths: ["firestore.rules", "**/firebase*", "functions/**"]
---

- Firestore 규칙 변경 시 반드시 `firebase emulators:exec` 테스트 먼저
- `firebase deploy --only firestore:rules` 단독 배포 가능
- 사용자 데이터 경로: `users/{uid}/` — uid는 Firebase Auth uid
- 게스트 데이터는 localStorage만, Firestore 저장 금지
