# archive/

메인 앱 설계와 **별개**로 보관되는 독립 실행형 프로젝트 및 원본 자료.
여기 있는 파일은 `index.html` / `app.js` 런타임에서 참조되지 **않는다**.

## 구성

- `excel-parser/` — Vite + React 기반 급여 CSV 파서 실험 프로젝트 (별도 `package.json`)
- `nurse-rostering-builder/` — Vite 기반 간호사 스케줄 빌더 (별도 프로젝트)
- `angio/source-pdfs/` — 혈관조영실/병동 듀티표 원본 PDF (파서 개발 레퍼런스)

## 정책

- 메인 앱 코드가 archive/ 경로를 import 하지 않는다.
- 새 기능은 메인 앱에 통합하거나 별도 레포로 이관한다.
- 더 이상 참고할 필요가 없어지면 삭제한다.
