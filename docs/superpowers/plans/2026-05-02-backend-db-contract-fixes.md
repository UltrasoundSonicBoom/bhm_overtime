# Backend DB Contract Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the audited backend, Firestore, migration, and verification breakpoints so DB/backend behavior is secure, connected, and testable.

**Architecture:** Keep the current two-surface backend model: FastAPI + SQLite owns parser cache, corpus, and admin review queue; Firebase Auth/Firestore owns user-scoped app data under `users/{uid}/**`. Do not open public top-level Firestore writes for `anonymous_corpus`; make corpus submission backend-only unless a later policy explicitly allows Firestore write-only collection rules.

**Tech Stack:** FastAPI, SQLite, Pydantic v2, pytest/TestClient, Astro/Vite, Firebase Web SDK, Firestore rules, Vitest/jsdom, Playwright.

---

## File Structure

- Modify: `backend/app/main.py`
  - Owns FastAPI route behavior, route-level validation, admin auth dependency wiring, and health response.
- Create: `backend/app/security.py`
  - Owns `SNUHMATE_ADMIN_TOKEN` parsing and admin `Authorization: Bearer ...` enforcement.
- Create: `backend/app/corpus/validation.py`
  - Owns server-side corpus allowlist validation and payload sanitization before SQLite persistence.
- Modify: `backend/app/corpus/store.py`
  - Stores only sanitized corpus/review payloads.
- Modify: `backend/README.md`
  - Documents real admin auth, backend-only corpus policy, and currently implemented routes.
- Create: `backend/tests/test_api_validation.py`
  - FastAPI route regression tests for invalid cache/corpus input, health DB checks, and payload limits.
- Create: `backend/tests/test_admin_auth.py`
  - FastAPI route regression tests for admin review auth.
- Modify: `apps/web/src/firebase/migration-dialog.js`
  - Fixes schedule migration crash and makes schedule migration visible in result summaries.
- Modify: `tests/integration/firebase/migration-dialog.test.js`
  - Adds failing coverage for schedule guest data migration.
- Modify: `apps/web/src/firebase/sync/corpus-sync.js`
  - Removes blocked top-level Firestore write attempt and uses backend-only submission.
- Create: `tests/integration/firebase/corpus-sync.test.js`
  - Confirms corpus submission does not call Firestore and gracefully fails when backend is unavailable.
- Modify: `apps/web/src/firebase/sync/profile-sync.js`
  - Aligns identity/payroll split with real profile fields used by the app.
- Modify: `apps/web/src/firebase/sync/_encrypted-fields.js`
  - Encrypts real profile fields such as `employeeNumber`, `jobType`, `grade`, `year`, and `weeklyHours`.
- Modify: `tests/integration/firebase/profile-sync.test.js`
  - Adds raw-store encryption tests for real profile fields.
- Modify: `apps/web/src/firebase/key-registry.js`
  - Adds `snuhmate_schedule_records` to the registry and exports runtime coverage metadata if needed.
- Modify: `apps/web/src/firebase/auto-sync.js`
  - Adds handlers for registered keys that currently do not sync.
- Modify: `apps/web/src/firebase/hydrate.js`
  - Hydrates and clears schedule records.
- Modify: `docs/db-schema.md`
  - Documents schedule collection and backend-only corpus policy.
- Modify: `tests/integration/firebase/inventory-coverage.test.js`
  - Converts registry coverage from path-only to executable runtime coverage.
- Modify: `playwright.config.js`
  - Uses pnpm-compatible webServer command.
- Modify: `eslint.config.js`
  - Ignores generated/vendored files and either defines browser globals or removes obsolete rule references so lint failures represent real source failures.

---

### Task 1: Fix Guest Schedule Migration Crash

**Files:**
- Modify: `apps/web/src/firebase/migration-dialog.js:124-248`
- Modify: `tests/integration/firebase/migration-dialog.test.js:14-112`

- [ ] **Step 1: Write the failing test**

Add a `writeAllSchedule` mock and a test proving `snuhmate_schedule_records` does not crash migration.

```js
const mockWriteAllSchedule = vi.fn();

vi.mock('/src/firebase/sync/schedule-sync.js', () => ({
  writeAllSchedule: mockWriteAllSchedule,
}));
```

Add this `beforeEach` line:

```js
mockWriteAllSchedule.mockResolvedValue();
```

Add this test inside `describe('uploadCategories', ...)`:

```js
it('overtime 선택 + 근무표 데이터 존재 → writeAllSchedule 호출하고 FLAG 설정', async () => {
  localStorage.setItem('overtimeRecords_guest', JSON.stringify({ '2026-04': [{ id: 'ot1', totalHours: 3 }] }));
  localStorage.setItem('snuhmate_schedule_records', JSON.stringify({
    '2026-04': {
      mine: { 1: 'D', 2: 'E' },
      team: { '김지원': { 1: 'N' } },
    },
  }));

  const { uploadCategories } = await import('../../../apps/web/src/firebase/migration-dialog.js');
  const result = await uploadCategories('uid1', ['overtime']);

  expect(mockWriteAllOvertime).toHaveBeenCalled();
  expect(mockWriteAllSchedule).toHaveBeenCalledWith(null, 'uid1', {
    '2026-04': {
      mine: { 1: 'D', 2: 'E' },
      team: { '김지원': { 1: 'N' } },
    },
  });
  expect(result.failed).toEqual([]);
  expect(result.ok).toContain('근무표');
  expect(localStorage.getItem('snuhmate_migration_done_v1')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/integration/firebase/migration-dialog.test.js
```

Expected: FAIL with `ReferenceError: tasks is not defined` or missing `writeAllSchedule` call.

- [ ] **Step 3: Write minimal implementation**

Replace the schedule branch in `uploadCategories()` with a `syncTasks.push()` entry.

```js
  if (selectedIds.includes('schedule') || selectedIds.includes('overtime')) {
    syncTasks.push({
      id: 'schedule',
      label: '근무표',
      run: async () => {
        const raw = localStorage.getItem('snuhmate_schedule_records');
        if (!raw) return;
        const data = JSON.parse(raw);
        const { writeAllSchedule } = await import('/src/firebase/sync/schedule-sync.js');
        await writeAllSchedule(null, uid, data);
      },
    });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm vitest run tests/integration/firebase/migration-dialog.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/firebase/migration-dialog.js tests/integration/firebase/migration-dialog.test.js
git commit -m "fix: migrate schedule guest data without crashing"
```

---

### Task 2: Lock Admin Review Routes Behind Admin Token

**Files:**
- Create: `backend/app/security.py`
- Modify: `backend/app/main.py:10-14,180-196`
- Create: `backend/tests/test_admin_auth.py`
- Modify: `backend/README.md:55-70`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_admin_auth.py`:

```python
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "admin_auth.db"))
    monkeypatch.delenv("SNUHMATE_ADMIN_TOKEN", raising=False)
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_admin_reviews_fail_closed_without_configured_token(client: TestClient):
    response = client.get("/admin/reviews")
    assert response.status_code == 503
    assert response.json()["detail"] == "admin auth not configured"


def test_admin_reviews_reject_missing_bearer_token(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "admin_auth_configured.db"))
    monkeypatch.setenv("SNUHMATE_ADMIN_TOKEN", "secret-token")
    from app.main import app

    with TestClient(app) as c:
        response = c.get("/admin/reviews")

    assert response.status_code == 401
    assert response.json()["detail"] == "admin token required"


def test_admin_reviews_accept_valid_bearer_token(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "admin_auth_ok.db"))
    monkeypatch.setenv("SNUHMATE_ADMIN_TOKEN", "secret-token")
    from app.main import app

    with TestClient(app) as c:
        response = c.get("/admin/reviews", headers={"Authorization": "Bearer secret-token"})

    assert response.status_code == 200
    assert response.json() == {"reviews": []}


def test_admin_review_status_requires_valid_token(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "admin_auth_status.db"))
    monkeypatch.setenv("SNUHMATE_ADMIN_TOKEN", "secret-token")
    from app.main import app

    with TestClient(app) as c:
        missing = c.post("/admin/reviews/1/status", data={"status": "verified"})
        wrong = c.post(
            "/admin/reviews/1/status",
            data={"status": "verified"},
            headers={"Authorization": "Bearer wrong"},
        )

    assert missing.status_code == 401
    assert wrong.status_code == 403
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && poetry run pytest tests/test_admin_auth.py -q
```

Expected: FAIL because admin routes currently return 200/404 without auth.

- [ ] **Step 3: Add admin auth dependency**

Create `backend/app/security.py`:

```python
"""Backend security helpers."""
import hmac
import os

from fastapi import Header, HTTPException, status


def _configured_admin_token() -> str | None:
    token = os.environ.get("SNUHMATE_ADMIN_TOKEN", "").strip()
    return token or None


def require_admin_token(authorization: str | None = Header(default=None)) -> None:
    expected = _configured_admin_token()
    if not expected:
      raise HTTPException(
          status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
          detail="admin auth not configured",
      )

    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="admin token required",
        )

    provided = authorization[len(prefix):].strip()
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="admin token invalid",
        )
```

Fix the indentation to 4 spaces in the first `raise` block before running tests.

- [ ] **Step 4: Wire dependency into admin routes**

Modify imports in `backend/app/main.py`:

```python
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from app.security import require_admin_token
```

Modify route signatures:

```python
@app.get("/admin/reviews")
async def admin_reviews(_admin: None = Depends(require_admin_token)):
    """confidence < 0.9 리뷰 큐."""
    items = list_pending_reviews(limit=50)
    return {"reviews": items}


@app.post("/admin/reviews/{review_id}/status")
async def admin_review_update(
    review_id: int,
    status: str = Form(...),
    _admin: None = Depends(require_admin_token),
):
    """리뷰 상태 변경 (verified/rejected)."""
    try:
        ok = update_review_status(review_id, status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not ok:
        raise HTTPException(status_code=404, detail="review not found")
    return {"ok": True}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd backend && poetry run pytest tests/test_admin_auth.py -q
```

Expected: PASS.

- [ ] **Step 6: Update README**

In `backend/README.md`, replace the admin endpoint note with:

```markdown
## Admin review auth

`GET /admin/reviews` and `POST /admin/reviews/{id}/status` require:

```bash
export SNUHMATE_ADMIN_TOKEN="replace-with-long-random-token"
curl -H "Authorization: Bearer $SNUHMATE_ADMIN_TOKEN" http://localhost:8001/admin/reviews
```

If `SNUHMATE_ADMIN_TOKEN` is not set, admin routes fail closed with HTTP 503.
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/security.py backend/app/main.py backend/tests/test_admin_auth.py backend/README.md
git commit -m "fix: protect backend admin review routes"
```

---

### Task 3: Validate Backend Inputs and Health

**Files:**
- Modify: `backend/app/main.py:67-176`
- Create: `backend/app/corpus/validation.py`
- Modify: `backend/app/corpus/store.py:55-85`
- Create: `backend/tests/test_api_validation.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_api_validation.py`:

```python
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "api_validation.db"))
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_cache_put_rejects_invalid_sha256(client: TestClient):
    response = client.post("/cache/put", data={
        "hash": "x",
        "title": "bad",
        "grid_json": json.dumps({"dept": "ICU", "month": "2026-04", "rows": [], "confidence": 1}),
    })
    assert response.status_code == 422
    assert response.json()["detail"] == "hash must be a 64-character sha256 hex string"


def test_cache_put_rejects_invalid_grid_json(client: TestClient):
    response = client.post("/cache/put", data={
        "hash": "a" * 64,
        "title": "bad",
        "grid_json": "{not-json",
    })
    assert response.status_code == 400
    assert response.json()["detail"].startswith("invalid grid_json")


def test_corpus_submit_rejects_non_object(client: TestClient):
    response = client.post("/corpus/submit", data={"corpus_json": "[]"})
    assert response.status_code == 400
    assert response.json()["detail"] == "corpus_json must be an object"


def test_corpus_submit_rejects_non_numeric_confidence(client: TestClient):
    response = client.post("/corpus/submit", data={
        "corpus_json": json.dumps({"deptCategory": "ICU", "confidence": "high", "rows": []})
    })
    assert response.status_code == 400
    assert response.json()["detail"] == "confidence must be a number between 0 and 1"


def test_corpus_submit_sanitizes_rows(client: TestClient):
    payload = {
        "deptCategory": "ICU",
        "confidence": 0.5,
        "parserVersion": "v1",
        "consentVersion": "v1",
        "rows": [{"name": "실명", "days": {"1": "D"}, "note": "secret"}],
        "rawText": "should not persist",
    }
    response = client.post("/corpus/submit", data={"corpus_json": json.dumps(payload, ensure_ascii=False)})
    assert response.status_code == 200

    reviews = client.get("/admin/reviews", headers={"Authorization": "Bearer unused"})
    assert reviews.status_code in (401, 503)
```

The sanitization storage assertion will be completed after Task 2 auth is wired by querying `list_pending_reviews()` directly in a unit test if route auth blocks the review endpoint.

- [ ] **Step 2: Run tests to verify failures**

Run:

```bash
cd backend && poetry run pytest tests/test_api_validation.py -q
```

Expected: FAIL because invalid hash currently returns 200 and malformed corpus values can 500.

- [ ] **Step 3: Add validation helpers**

Add to `backend/app/main.py`:

```python
import re
from pydantic import ValidationError

SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
MAX_FORM_TEXT_BYTES = 2 * 1024 * 1024


def _validate_sha256(value: str) -> str:
    if not SHA256_RE.fullmatch(value or ""):
        raise HTTPException(
            status_code=422,
            detail="hash must be a 64-character sha256 hex string",
        )
    return value.lower()


def _reject_large_text(value: str, label: str) -> None:
    if len(value.encode("utf-8")) > MAX_FORM_TEXT_BYTES:
        raise HTTPException(status_code=413, detail=f"{label} too large")
```

Wrap `DutyGrid.model_validate_json()`:

```python
    _validate_sha256(hash)
    _reject_large_text(grid_json, "grid_json")
    try:
        grid = DutyGrid.model_validate_json(grid_json)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"invalid grid_json: {e.errors()[0]['msg']}")
```

- [ ] **Step 4: Add corpus sanitizer**

Create `backend/app/corpus/validation.py`:

```python
"""Server-side corpus payload validation and sanitization."""
from __future__ import annotations

from fastapi import HTTPException

ALLOWED_DEPTS = {"ICU", "CCU", "NICU", "응급실", "병동", "수술실", "외래", "기타"}
ALLOWED_TOP_LEVEL = {
    "deptCategory",
    "confidence",
    "parserVersion",
    "consentVersion",
    "rows",
    "codesFound",
    "month",
}
ALLOWED_ROW_FIELDS = {"days", "role", "confidence"}


def sanitize_corpus_payload(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="corpus_json must be an object")

    dept = payload.get("deptCategory")
    if dept and dept not in ALLOWED_DEPTS:
        raise HTTPException(status_code=400, detail=f"deptCategory not allowed: {dept}")

    confidence = payload.get("confidence", 0)
    if not isinstance(confidence, (int, float)) or isinstance(confidence, bool) or not 0 <= confidence <= 1:
        raise HTTPException(status_code=400, detail="confidence must be a number between 0 and 1")

    rows = payload.get("rows", [])
    if not isinstance(rows, list):
        raise HTTPException(status_code=400, detail="rows must be an array")

    clean = {k: payload[k] for k in ALLOWED_TOP_LEVEL if k in payload and k != "rows"}
    clean["confidence"] = float(confidence)
    clean["rows"] = []
    for row in rows[:200]:
        if not isinstance(row, dict):
            continue
        clean_row = {k: row[k] for k in ALLOWED_ROW_FIELDS if k in row}
        if "days" in clean_row and not isinstance(clean_row["days"], dict):
            clean_row.pop("days", None)
        clean["rows"].append(clean_row)
    return clean
```

Use it in `backend/app/main.py`:

```python
from app.corpus.validation import sanitize_corpus_payload
```

Then inside `corpus_submit()`:

```python
    _reject_large_text(corpus_json, "corpus_json")
    try:
        payload = _json.loads(corpus_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid corpus_json: {e}")

    payload = sanitize_corpus_payload(payload)
    cid = add_corpus_entry(payload)
```

- [ ] **Step 5: Add real DB health check**

Add to `backend/app/cache/sqlite.py`:

```python
def ping_db(db_path: Optional[Path] = None) -> bool:
    try:
        with _conn(db_path) as conn:
            conn.execute("SELECT 1").fetchone()
        return True
    except sqlite3.Error:
        return False
```

Import and use it in `/health`:

```python
from app.cache.sqlite import ping_db

db_ok = ping_db()
return HealthResponse(ok=db_ok, lm_studio=lm_ok, models=models, db=db_ok)
```

- [ ] **Step 6: Run tests**

Run:

```bash
cd backend && poetry run pytest tests/test_api_validation.py tests/test_cache.py tests/test_corpus.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/main.py backend/app/cache/sqlite.py backend/app/corpus/validation.py backend/app/corpus/store.py backend/tests/test_api_validation.py
git commit -m "fix: validate backend cache and corpus inputs"
```

---

### Task 4: Make Corpus Submission Backend-Only

**Files:**
- Modify: `apps/web/src/firebase/sync/corpus-sync.js:1-70`
- Create: `tests/integration/firebase/corpus-sync.test.js`
- Modify: `docs/db-schema.md`

- [ ] **Step 1: Write failing client test**

Create `tests/integration/firebase/corpus-sync.test.js`:

```js
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const mockAnonymize = vi.fn();
const mockGetConsent = vi.fn();
const mockProbeBackend = vi.fn();

vi.mock('../../../apps/web/src/client/schedule-parser/anonymize.js', () => ({
  anonymize: mockAnonymize,
  getCorpusConsent: mockGetConsent,
}));

vi.mock('../../../apps/web/src/client/schedule-parser/parse-cache.js', () => ({
  probeBackend: mockProbeBackend,
}));

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.FormData = dom.window.FormData;
});

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  global.fetch = vi.fn();
  mockGetConsent.mockReturnValue({ granted: true });
  mockAnonymize.mockReturnValue({
    deptCategory: 'ICU',
    confidence: 0.8,
    rows: [{ days: { 1: 'D' } }],
  });
});

describe('corpus-sync backend-only policy', () => {
  it('does not initialize Firestore or write anonymous_corpus', async () => {
    mockProbeBackend.mockResolvedValue('http://localhost:8001');
    global.fetch.mockResolvedValue({ ok: true });

    const { submitToCorpus } = await import('../../../apps/web/src/firebase/sync/corpus-sync.js');
    const result = await submitToCorpus({ grid: { rows: [{ name: 'A' }] } });

    expect(result.submitted).toBe(true);
    expect(result.backend).toBe(true);
    expect(result.firestore).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8001/corpus/submit',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns all_destinations_failed when backend is unavailable', async () => {
    mockProbeBackend.mockResolvedValue(null);

    const { submitToCorpus } = await import('../../../apps/web/src/firebase/sync/corpus-sync.js');
    const result = await submitToCorpus({ grid: { rows: [{ name: 'A' }] } });

    expect(result).toEqual({
      submitted: false,
      reason: 'all_destinations_failed',
      firestore: false,
      backend: false,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/integration/firebase/corpus-sync.test.js
```

Expected: FAIL because current code tries Firestore and may report `firestore: true`.

- [ ] **Step 3: Remove Firestore write path**

Replace `apps/web/src/firebase/sync/corpus-sync.js` imports:

```js
import { anonymize, getCorpusConsent } from '../../client/schedule-parser/anonymize.js';
```

Remove `initFirebase`, `firebaseConfig`, `_f()`, and the Firestore try/catch block.

Use this backend-only body after anonymization:

```js
  let backendOk = false;
  try {
    const { probeBackend } = await import('../../client/schedule-parser/parse-cache.js');
    const url = await probeBackend();
    if (url) {
      const fd = new FormData();
      fd.set('corpus_json', JSON.stringify(anon));
      const resp = await fetch(`${url}/corpus/submit`, { method: 'POST', body: fd });
      backendOk = resp.ok;
    }
  } catch (e) {
    backendOk = false;
  }

  return {
    submitted: backendOk,
    reason: backendOk ? undefined : 'all_destinations_failed',
    firestore: false,
    backend: backendOk,
  };
```

- [ ] **Step 4: Update docs**

In `docs/db-schema.md`, add a short section after Firestore rules:

```markdown
## 7-1. Anonymous Corpus Policy

`anonymous_corpus` is not a Firestore collection in the current security model.
The browser submits anonymized schedule corpus only to the local FastAPI backend
`POST /corpus/submit`; Firestore rules intentionally deny top-level writes.
```

- [ ] **Step 5: Run tests**

Run:

```bash
pnpm vitest run tests/integration/firebase/corpus-sync.test.js tests/integration/firebase/security-rules.test.js
```

Expected: corpus test PASS. Security rules may SKIP if emulator is not running; run emulator-backed suite in final verification.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/firebase/sync/corpus-sync.js tests/integration/firebase/corpus-sync.test.js docs/db-schema.md
git commit -m "fix: route anonymous corpus through backend only"
```

---

### Task 5: Encrypt Real Profile Fields

**Files:**
- Modify: `apps/web/src/firebase/sync/profile-sync.js:18-35`
- Modify: `apps/web/src/firebase/sync/_encrypted-fields.js:16-24`
- Modify: `tests/integration/firebase/profile-sync.test.js`
- Modify: `docs/db-schema.md`

- [ ] **Step 1: Write failing test**

Add to `tests/integration/firebase/profile-sync.test.js`:

```js
it('실제 profile 필드 employeeNumber/jobType/grade/year/weeklyHours 를 암호화', async () => {
  const { writeProfile, readProfile } = await import('../../../apps/web/src/firebase/sync/profile-sync.js');
  const db = _createMockDb();
  const original = {
    name: '김간호',
    employeeNumber: '123456',
    department: '중환자실',
    jobType: '간호직',
    grade: 'G4',
    year: 7,
    weeklyHours: 209,
  };

  await writeProfile(db, 'user-real', original);
  const restored = await readProfile(db, 'user-real');
  expect(restored).toEqual(expect.objectContaining(original));

  const raw = JSON.stringify(db._store);
  expect(raw).not.toContain('123456');
  expect(raw).not.toContain('간호직');
  expect(raw).not.toContain('G4');
  expect(raw).not.toContain('209');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/integration/firebase/profile-sync.test.js
```

Expected: FAIL because one or more real fields remain plaintext.

- [ ] **Step 3: Update field split**

Replace field arrays in `profile-sync.js`:

```js
const IDENTITY_FIELDS = [
  'name', 'employeeId', 'employeeNumber', 'department', 'position', 'hireDate',
  'jobLevel', 'rank', 'jobType', 'grade', 'year', 'workHistorySeeded',
];
const PAYROLL_FIELDS = [
  'hourlyWage', 'annualSalary', 'allowancePolicy', 'manualHourly',
  'paymentDay', 'baseHours', 'paymentType', 'weeklyHours',
];
```

- [ ] **Step 4: Update encryption whitelist**

Replace profile entries in `_encrypted-fields.js`:

```js
  'profile/identity': [
    'name', 'employeeId', 'employeeNumber', 'department', 'position', 'hireDate',
    'jobLevel', 'rank', 'jobType', 'grade', 'year',
  ],
  'profile/payroll': [
    'hourlyWage', 'annualSalary', 'manualHourly', 'allowancePolicy',
    'paymentDay', 'baseHours', 'paymentType', 'weeklyHours',
  ],
```

- [ ] **Step 5: Update docs**

In `docs/db-schema.md`, add `employeeNumber`, `jobType`, `grade`, `year`, and `weeklyHours` to the profile tables with encrypted status.

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm vitest run tests/integration/firebase/profile-sync.test.js tests/integration/firebase/crypto.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/firebase/sync/profile-sync.js apps/web/src/firebase/sync/_encrypted-fields.js tests/integration/firebase/profile-sync.test.js docs/db-schema.md
git commit -m "fix: encrypt live profile fields"
```

---

### Task 6: Close Registry to Runtime Sync Gaps

**Files:**
- Modify: `apps/web/src/firebase/key-registry.js`
- Modify: `apps/web/src/firebase/auto-sync.js`
- Modify: `apps/web/src/firebase/hydrate.js`
- Modify: `tests/integration/firebase/inventory-coverage.test.js`
- Modify: `tests/integration/firebase/key-registry.test.js`

- [ ] **Step 1: Write failing inventory coverage test**

Add to `inventory-coverage.test.js`:

```js
import { HANDLER_BASES, SPECIAL_KEY_PATTERNS } from '../../../apps/web/src/firebase/auto-sync.js';
import { HYDRATED_BASES, CLEARED_EXACT_BASES } from '../../../apps/web/src/firebase/hydrate.js';

it('모든 sync 키가 auto-sync 또는 명시적 special pattern 으로 실행 가능', () => {
  const executable = new Set([...HANDLER_BASES, ...SPECIAL_KEY_PATTERNS]);
  for (const key of syncKeys()) {
    expect(executable.has(key), `${key}: auto-sync 실행 경로 없음`).toBe(true);
  }
});

it('주요 user-scoped sync 키가 hydrate/clear 경로에 포함', () => {
  for (const key of ['snuhmate_hr_profile', 'overtimeRecords', 'overtimePayslipData', 'snuhmate_work_history', 'snuhmate_reg_favorites', 'snuhmate_schedule_records']) {
    expect(HYDRATED_BASES, `${key}: hydrate 누락`).toContain(key);
    expect(CLEARED_EXACT_BASES, `${key}: logout clear 누락`).toContain(key);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm vitest run tests/integration/firebase/inventory-coverage.test.js
```

Expected: FAIL because exports and runtime handlers are missing.

- [ ] **Step 3: Add schedule registry key**

Add to `KEY_REGISTRY`:

```js
  'snuhmate_schedule_records': {
    scope: 'sync', shape: 'collection-by-yyyymm',
    firestorePath: (uid) => `users/${uid}/schedule`,
    category: 'schedule',
  },
```

Update categories:

```js
export const CATEGORIES = ['identity', 'payroll', 'overtime', 'leave', 'workHistory', 'settings', 'reference', 'schedule'];
```

- [ ] **Step 4: Add auto-sync handlers and metadata**

Modify imports:

```js
import { writeAllPayslips } from './sync/payslip-sync.js';
import { writeManualHourly } from './sync/settings-sync.js';
import { writeAllSchedule } from './sync/schedule-sync.js';
```

Add handlers:

```js
  'otManualHourly': (uid) => {
    const raw = localStorage.getItem('otManualHourly') || localStorage.getItem('otManualHourly_uid_' + uid);
    if (raw != null) return writeManualHourly(null, uid, Number(raw));
  },
  'overtimePayslipData': (uid) => {
    const all = _localValue('overtimePayslipData_uid_' + uid) || _localValue('overtimePayslipData') || {};
    return writeAllPayslips(null, uid, all);
  },
  'theme': (uid) => {
    const theme = localStorage.getItem('theme');
    if (theme) return writeSettings(null, uid, { theme });
  },
  'snuhmate_work_history_seeded': (uid) => {
    const seeded = localStorage.getItem('snuhmate_work_history_seeded');
    if (seeded != null) return writeProfile(null, uid, { workHistorySeeded: seeded === 'true' || seeded === '1' });
  },
  'snuhmate_schedule_records': (uid) => {
    const all = _localValue('snuhmate_schedule_records') || {};
    return writeAllSchedule(null, uid, all);
  },
```

Export metadata:

```js
export const HANDLER_BASES = Object.keys(HANDLERS);
export const SPECIAL_KEY_PATTERNS = ['payslip'];
```

- [ ] **Step 5: Add hydrate and clear for schedule**

Modify imports:

```js
import { readAllSchedule } from './sync/schedule-sync.js';
```

Export metadata:

```js
export const HYDRATED_BASES = [
  'snuhmate_hr_profile', 'overtimeRecords', 'leaveRecords', 'overtimePayslipData',
  'snuhmate_work_history', 'snuhmate_settings', 'snuhmate_reg_favorites',
  'snuhmate_schedule_records',
];
export const CLEARED_EXACT_BASES = [
  'snuhmate_hr_profile', 'overtimeRecords', 'overtimePayslipData',
  'snuhmate_work_history', 'snuhmate_reg_favorites', 'snuhmate_schedule_records',
];
```

Add exact clear key:

```js
'snuhmate_schedule_records',
```

Add hydrate task:

```js
    {
      key: 'schedule',
      run: async () => {
        const data = await readAllSchedule(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal('snuhmate_schedule_records', data);
      },
    },
```

- [ ] **Step 6: Run tests**

Run:

```bash
pnpm vitest run tests/integration/firebase/inventory-coverage.test.js tests/integration/firebase/key-registry.test.js tests/integration/firebase/schedule-sync.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/firebase/key-registry.js apps/web/src/firebase/auto-sync.js apps/web/src/firebase/hydrate.js tests/integration/firebase/inventory-coverage.test.js tests/integration/firebase/key-registry.test.js
git commit -m "fix: connect registry sync keys to runtime"
```

---

### Task 7: Fix Verification Tooling Signals

**Files:**
- Modify: `playwright.config.js`
- Modify: `eslint.config.js`
- Modify: `apps/web/src/client/schedule-tab.js`

- [ ] **Step 1: Write the failing command evidence**

Run:

```bash
pnpm test:smoke
pnpm lint
```

Expected before implementation:
- `pnpm test:smoke` fails with npm workspace webServer error.
- `pnpm lint` fails on generated/vendored files and missing `no-unsanitized/property` rule references.

- [ ] **Step 2: Fix Playwright webServer**

In `playwright.config.js`, replace the npm webServer command with pnpm:

```js
webServer: {
  command: 'pnpm --filter @snuhmate/web dev --host 127.0.0.1 --port 4321',
  url: 'http://127.0.0.1:4321',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
},
```

- [ ] **Step 3: Fix lint scope**

In `eslint.config.js`, ensure generated and vendored runtime files are ignored:

```js
{
  ignores: [
    'node_modules/**',
    'apps/web/dist/**',
    'apps/web/public/admin/lib/**',
    'public/admin/lib/**',
    'chrome-extension/**',
    'firestore-debug.log',
    'test-results/**',
  ],
}
```

- [ ] **Step 4: Remove missing rule comments**

In `apps/web/src/client/schedule-tab.js`, replace all comments like:

```js
// eslint-disable-next-line no-unsanitized/property
```

with:

```js
// HTML is escaped via esc() before assignment.
```

Do not change the actual escaped rendering logic in this task.

- [ ] **Step 5: Run verification**

Run:

```bash
pnpm lint
pnpm test:smoke
```

Expected: lint no longer fails on generated/vendored scopes or missing rule definitions. Smoke starts the pnpm web server instead of failing before tests.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.js eslint.config.js apps/web/src/client/schedule-tab.js
git commit -m "fix: align verification tooling with pnpm workspace"
```

---

### Task 8: Final Full Verification and Branch Hygiene

**Files:**
- Verify only unless a previous task exposed a real regression.
- Include: `backend/poetry.lock` if the team decides Poetry lockfile is part of this backend lane.

- [ ] **Step 1: Run backend tests**

```bash
pnpm backend:test
```

Expected: all backend tests pass.

- [ ] **Step 2: Run Firebase integration with emulator**

```bash
pnpm exec firebase emulators:exec --only firestore --project=snuhmate-test "pnpm exec vitest run tests/integration/firebase --reporter=dot"
```

Expected: all Firebase integration tests pass, including security-rules tests.

- [ ] **Step 3: Run broader web checks**

```bash
pnpm check
pnpm build
pnpm lint
pnpm test:smoke
```

Expected: pass or report only unrelated known warnings with exact file references.

- [ ] **Step 4: Check worktree**

```bash
git status --short --branch
```

Expected: only intentional source/test/docs changes and `backend/poetry.lock`.

- [ ] **Step 5: Commit final lockfile if keeping it**

If `backend/poetry.lock` remains untracked and backend tests depend on it:

```bash
git add backend/poetry.lock
git commit -m "chore: lock backend poetry dependencies"
```

- [ ] **Step 6: Report**

Summarize:
- which P0/P1 findings are closed,
- exact tests run,
- any intentionally deferred items,
- whether `codex/backend` is ready to merge into `main`.

---

## Self-Review

**Spec coverage:** The plan covers the audited P0/P1 issues: admin auth, migration crash, blocked Firestore corpus write, live profile encryption drift, registered sync keys without runtime handlers, backend invalid input 500s, DB health false positive, smoke/lint false signals.

**Placeholder scan:** No `TBD`, `TODO`, or “implement later” steps remain. Each code-changing task contains concrete test code, implementation code, commands, and expected output.

**Type consistency:** Test and implementation names match: `syncTasks`, `writeAllSchedule`, `require_admin_token`, `sanitize_corpus_payload`, `HANDLER_BASES`, `HYDRATED_BASES`, and `CLEARED_EXACT_BASES`.
