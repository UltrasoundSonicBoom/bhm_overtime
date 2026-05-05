# SNUH Mate Surya OCR Worker

This service is the GPU-side parser for SNUH payroll statements and nurse work schedules.

The web app uploads files; the existing backend proxies the upload to this worker. The worker runs the best parser for the file:

- Payroll: PDF text, scanned PDF, image, CSV, XLS, XLSX.
- Work schedule: image, scanned PDF, digital table PDF, CSV, XLSX, HTML-style XLS.
- Surya is used only where OCR is needed. Structured formats are parsed directly.

## Run

```powershell
cd services\surya-ocr
python -m pip install -r requirements.txt
python app.py --host 127.0.0.1 --port 8030
```

## API

```http
GET /health
POST /api/ocr/parse
```

`POST /api/ocr/parse` accepts `multipart/form-data`:

- `file`: uploaded file.
- `doc_type`: `auto`, `payroll`, or `work_schedule`.
- `uid`: Snuhmate user id or backend job owner id.
- `department_id`: optional ward/department hint for work schedule codebooks.

The response returns a canonical JSON envelope plus parser artifacts. Runtime outputs are written under `services/surya-ocr/runtime/`, which must not be committed.

## Why this is separate from backend

Surya + Torch CUDA is heavy and GPU-bound. The normal Snuhmate backend remains lightweight and forwards parsing jobs to this worker through `SNUHMATE_OCR_SERVICE_URL`.
