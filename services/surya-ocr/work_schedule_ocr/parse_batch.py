from __future__ import annotations

import argparse
import datetime as dt
import html
import json
from pathlib import Path
from typing import Any


DEFAULT_IMAGES = [
    Path("82_2603.jpeg"),
    Path("82_2604.jpeg"),
]
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "output"
DEFAULT_CODEBOOK = Path(__file__).resolve().parent / "work_codebook.json"
DEFAULT_DEPARTMENT_CODEBOOK_DIR = Path(__file__).resolve().parent / "codebooks" / "departments"
DEFAULT_SCHEDULE_PROFILE_DIR = Path(__file__).resolve().parent / "schedule_profiles" / "departments"


def department_id_from_image(image: Path) -> str | None:
    stem = image.stem
    digits = []
    for char in stem:
        if char.isdigit():
            digits.append(char)
            continue
        break
    return "".join(digits) or None


def codebook_paths_for_image(
    image: Path,
    global_codebook: Path,
    department_codebook_dir: Path | None = DEFAULT_DEPARTMENT_CODEBOOK_DIR,
) -> list[Path]:
    paths = [global_codebook]
    department_id = department_id_from_image(image)
    if department_id and department_codebook_dir:
        department_path = department_codebook_dir / f"{department_id}.json"
        if department_path.exists():
            paths.append(department_path)
    return paths


def schedule_profile_path_for_image(
    image: Path,
    schedule_profile_dir: Path | None = DEFAULT_SCHEDULE_PROFILE_DIR,
) -> Path | None:
    department_id = department_id_from_image(image)
    if not department_id or not schedule_profile_dir:
        return None
    path = schedule_profile_dir / f"{department_id}.json"
    return path if path.exists() else None


def render_dashboard_html(documents: list[dict[str, Any]]) -> str:
    def esc(value: Any) -> str:
        return html.escape("" if value is None else str(value))

    cards: list[str] = []
    total_employees = sum(int(doc.get("employee_count", 0)) for doc in documents)
    total_invalid = sum(int(doc.get("invalid_rows", 0)) for doc in documents)
    total_advisory = sum(int(doc.get("advisory_rows", 0)) for doc in documents)
    total_column_issues = sum(int(doc.get("column_profile_issues", 0)) for doc in documents)
    total_profile_repairs = sum(int(doc.get("profile_guided_repairs", 0)) for doc in documents)
    total_summary_repairs = sum(int(doc.get("summary_guided_repairs", 0)) for doc in documents)
    total_n_best = sum(int(doc.get("n_best_candidate_cells", 0)) for doc in documents)
    all_unknown = sorted(
        {
            code
            for doc in documents
            for code in doc.get("unknown_codes", [])
        }
    )

    for doc in documents:
        unknown = ", ".join(doc.get("unknown_codes", [])) or "-"
        invalid_rows = int(doc.get("invalid_rows", 0))
        status_class = "needs-review" if invalid_rows else "ok"
        cards.append(
            f"""
            <article class="doc-card {status_class}">
              <div>
                <h2>{esc(doc.get('stem'))}</h2>
                <p>{esc(doc.get('title'))}</p>
              </div>
              <dl>
                <div><dt>직원</dt><dd>{esc(doc.get('employee_count'))}</dd></div>
                <div><dt>검증 OK</dt><dd>{esc(doc.get('valid_rows'))}</dd></div>
                <div><dt>검증 필요</dt><dd>{esc(doc.get('invalid_rows'))}</dd></div>
                <div><dt>T 확인</dt><dd>{esc(doc.get('advisory_rows', 0))}</dd></div>
                <div><dt>컬럼</dt><dd>{esc(doc.get('column_profile_issues', 0))}</dd></div>
                <div><dt>요약보정</dt><dd>{esc(doc.get('summary_guided_repairs', 0))}</dd></div>
                <div><dt>자동수정</dt><dd>{esc(doc.get('profile_guided_repairs', 0))}</dd></div>
                <div><dt>N-BEST</dt><dd>{esc(doc.get('n_best_candidate_cells', 0))}</dd></div>
              </dl>
              <p class="unknown">미등록 코드: {esc(unknown)}</p>
              <a href="{esc(doc.get('href'))}">상세 보기</a>
            </article>
            """
        )

    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>근무표 OCR 품질 대시보드</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: #f5f7f9;
      color: #111827;
      font-family: Arial, "Malgun Gothic", sans-serif;
    }}
    header {{
      padding: 22px 28px 14px;
      background: #ffffff;
      border-bottom: 1px solid #d8dde5;
    }}
    h1 {{ margin: 0 0 8px; font-size: 24px; }}
    .meta {{ color: #5f6875; display: flex; gap: 18px; flex-wrap: wrap; }}
    main {{ padding: 22px 28px 36px; }}
    .stats {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }}
    .stat {{
      border: 1px solid #d8dde5;
      background: #ffffff;
      border-radius: 8px;
      padding: 12px 14px;
    }}
    .stat strong {{ display: block; font-size: 22px; margin-top: 4px; }}
    .cards {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; }}
    .doc-card {{
      border: 1px solid #d8dde5;
      border-left: 6px solid #2f6f73;
      background: #ffffff;
      border-radius: 8px;
      padding: 15px 16px;
    }}
    .doc-card.needs-review {{ border-left-color: #b42318; }}
    .doc-card h2 {{ margin: 0; font-size: 18px; }}
    .doc-card p {{ margin: 6px 0 0; color: #5f6875; }}
    dl {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }}
    dt {{ color: #5f6875; font-size: 12px; }}
    dd {{ margin: 2px 0 0; font-weight: 700; font-size: 18px; }}
    .unknown {{ min-height: 20px; }}
    a {{
      display: inline-block;
      margin-top: 10px;
      color: #0f4c5c;
      font-weight: 700;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <header>
    <h1>근무표 OCR 품질 대시보드</h1>
    <div class="meta">
      <span>문서 {len(documents)}개</span>
      <span>생성 {esc(dt.datetime.now().isoformat(timespec='seconds'))}</span>
    </div>
  </header>
  <main>
    <section class="stats">
      <div class="stat">전체 직원<strong>{total_employees}</strong></div>
      <div class="stat">검증 필요 행<strong>{total_invalid}</strong></div>
      <div class="stat">T 확인 행<strong>{total_advisory}</strong></div>
      <div class="stat">컬럼 교차검증<strong>{total_column_issues}</strong></div>
      <div class="stat">요약보정<strong>{total_summary_repairs}</strong></div>
      <div class="stat">자동 후보수정<strong>{total_profile_repairs}</strong></div>
      <div class="stat">N-BEST 후보셀<strong>{total_n_best}</strong></div>
      <div class="stat">미등록 코드<strong>{len(all_unknown)}</strong></div>
    </section>
    <section class="cards">
      {''.join(cards)}
    </section>
  </main>
</body>
</html>
"""


def document_summary(schedule_path: Path, href: str) -> dict[str, Any]:
    schedule = json.loads(schedule_path.read_text(encoding="utf-8"))
    quality = schedule.get("quality", {})
    return {
        "stem": schedule_path.parent.name,
        "href": href,
        "title": schedule.get("title") or schedule_path.parent.name,
        "employee_count": quality.get("employee_count", len(schedule.get("employees", []))),
        "valid_rows": quality.get("valid_employee_rows", 0),
        "invalid_rows": quality.get("invalid_employee_rows", 0),
        "advisory_rows": quality.get("advisory_employee_rows", 0),
        "column_profile_issues": quality.get("column_profile_issue_count", 0),
        "column_profile_score": quality.get("column_profile_score", 0),
        "summary_guided_repairs": len(quality.get("summary_guided_repairs", [])),
        "profile_guided_repairs": len(quality.get("profile_guided_repairs", [])),
        "n_best_candidate_cells": quality.get("n_best_candidate_cells", 0),
        "n_best_candidates_total": quality.get("n_best_candidates_total", 0),
        "unknown_codes": quality.get("unknown_codes", []),
    }


def parse_batch(
    images: list[Path],
    output_dir: Path,
    codebook_path: Path,
    department_codebook_dir: Path | None = DEFAULT_DEPARTMENT_CODEBOOK_DIR,
    schedule_profile_dir: Path | None = DEFAULT_SCHEDULE_PROFILE_DIR,
) -> dict[str, Any]:
    from parse_schedule import parse_schedule

    output_dir.mkdir(parents=True, exist_ok=True)
    documents: list[dict[str, Any]] = []
    for image in images:
        doc_dir = output_dir / image.stem
        parse_schedule(
            image,
            doc_dir,
            codebook_paths_for_image(image, codebook_path, department_codebook_dir),
            schedule_profile_path_for_image(image, schedule_profile_dir),
        )
        document = document_summary(doc_dir / "schedule.json", f"{image.stem}/index.html")
        document["department_id"] = department_id_from_image(image)
        documents.append(document)

    summary = {
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "documents": documents,
    }
    (output_dir / "batch_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "index.html").write_text(
        render_dashboard_html(documents),
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse multiple work schedule images and build a quality dashboard.")
    parser.add_argument("--images", nargs="+", type=Path, default=DEFAULT_IMAGES)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--codebook", type=Path, default=DEFAULT_CODEBOOK)
    parser.add_argument("--department-codebook-dir", type=Path, default=DEFAULT_DEPARTMENT_CODEBOOK_DIR)
    parser.add_argument("--schedule-profile-dir", type=Path, default=DEFAULT_SCHEDULE_PROFILE_DIR)
    args = parser.parse_args()

    summary = parse_batch(
        args.images,
        args.output_dir,
        args.codebook,
        args.department_codebook_dir,
        args.schedule_profile_dir,
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
