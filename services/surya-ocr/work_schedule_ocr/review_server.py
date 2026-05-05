from __future__ import annotations

import argparse
import datetime as dt
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
from typing import Any

from learning_pipeline import default_schedule_paths, export_training_dataset


PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = PROJECT_DIR / "output"
DEFAULT_CORRECTIONS = PROJECT_DIR / "corrections"
DEFAULT_REVIEW_EVENTS = PROJECT_DIR / "corrections" / "review_events"
DEFAULT_LEARNED_CANDIDATES = PROJECT_DIR / "corrections" / "learned_candidates.json"
DEFAULT_TRAINING = PROJECT_DIR / "data" / "training"


def safe_document_id(value: Any) -> str:
    document = Path(str(value or "document")).stem
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", document):
        raise ValueError("Invalid document id")
    return document


def write_review_payload(
    payload: dict[str, Any],
    corrections_dir: Path,
    event_dir: Path,
    training_output_dir: Path | None = None,
    schedule_paths: list[Path] | None = None,
) -> dict[str, Any]:
    document = safe_document_id(payload.get("document"))
    cells = payload.get("cells", [])
    if not isinstance(cells, list):
        raise ValueError("cells must be a list")

    corrections_dir.mkdir(parents=True, exist_ok=True)
    event_dir.mkdir(parents=True, exist_ok=True)
    normalized_payload = {
        "version": 1,
        "document": document,
        "updated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "source_image": payload.get("source_image"),
        "cells": cells,
    }

    corrections_path = corrections_dir / f"{document}.json"
    event_path = event_dir / f"{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}_{document}.json"
    text = json.dumps(normalized_payload, ensure_ascii=False, indent=2)
    corrections_path.write_text(text, encoding="utf-8")
    event_path.write_text(text, encoding="utf-8")
    candidates_path = update_learned_candidates(normalized_payload, corrections_dir / "learned_candidates.json")
    result: dict[str, Any] = {
        "corrections_path": str(corrections_path),
        "event_path": str(event_path),
        "candidates_path": str(candidates_path),
    }
    if training_output_dir is not None:
        result["training_manifest"] = export_training_dataset(
            schedule_paths or default_schedule_paths(),
            corrections_dir,
            training_output_dir,
        )
    return result


def update_learned_candidates(payload: dict[str, Any], candidates_path: Path) -> Path:
    now = dt.datetime.now().isoformat(timespec="seconds")
    if candidates_path.exists():
        data = json.loads(candidates_path.read_text(encoding="utf-8"))
    else:
        data = {"version": 1, "candidates": {}}

    candidates = data.setdefault("candidates", {})
    document = payload.get("document")
    for cell in payload.get("cells", []):
        field = str(cell.get("field") or "")
        if not (field.startswith("day:") or field.startswith("summary:")):
            continue
        raw_text = str(cell.get("raw_text") or cell.get("original") or "").strip()
        value = str(cell.get("value") or "").strip()
        if not raw_text or not value or raw_text == value:
            continue
        key = f"{raw_text} -> {value}"
        candidate = candidates.setdefault(
            key,
            {
                "raw_text": raw_text,
                "corrected_value": value,
                "support_count": 0,
                "documents": [],
                "first_seen": now,
                "last_seen": now,
                "status": "needs-review",
            },
        )
        candidate["support_count"] = int(candidate.get("support_count", 0)) + 1
        candidate["last_seen"] = now
        if document and document not in candidate["documents"]:
            candidate["documents"].append(document)

    candidates_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return candidates_path


class ReviewRequestHandler(SimpleHTTPRequestHandler):
    corrections_dir = DEFAULT_CORRECTIONS
    event_dir = DEFAULT_REVIEW_EVENTS
    training_output_dir = DEFAULT_TRAINING
    schedule_output_dir = DEFAULT_OUTPUT

    def do_POST(self) -> None:
        if self.path != "/api/corrections":
            self.send_error(404, "Not found")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            result = write_review_payload(
                payload,
                self.corrections_dir,
                self.event_dir,
                self.training_output_dir,
                default_schedule_paths(self.schedule_output_dir),
            )
        except Exception as exc:
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False).encode("utf-8"))
            return

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps({"ok": True, **result}, ensure_ascii=False).encode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve OCR review HTML and accept correction payloads.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8010)
    parser.add_argument("--directory", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--corrections-dir", type=Path, default=DEFAULT_CORRECTIONS)
    args = parser.parse_args()

    handler_class = lambda *handler_args, **handler_kwargs: ReviewRequestHandler(  # noqa: E731
        *handler_args,
        directory=str(args.directory),
        **handler_kwargs,
    )
    ReviewRequestHandler.corrections_dir = args.corrections_dir
    ReviewRequestHandler.event_dir = args.corrections_dir / "review_events"
    ReviewRequestHandler.training_output_dir = DEFAULT_TRAINING
    ReviewRequestHandler.schedule_output_dir = args.directory
    server = ThreadingHTTPServer((args.host, args.port), handler_class)
    print(f"Serving {args.directory} at http://{args.host}:{args.port}/index.html")
    server.serve_forever()


if __name__ == "__main__":
    main()
