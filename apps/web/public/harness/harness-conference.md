---
name: hospital-harness-clinical-conference
description: "임상 콘퍼런스 준비 에이전트팀 하네스. 오케스트레이터 + 문헌검색·케이스요약·슬라이드생성 전문 에이전트."
---

# 임상 콘퍼런스 준비 팀 하네스

CPC(임상병리 콘퍼런스)·질향상 회의·다학제 콘퍼런스 준비를 에이전트팀이 자동 수행한다.

## 에이전트 구성

```
🧠 오케스트레이터 (smate-feature-ship 패턴)
    │
    ├── 🔍 문헌검색 에이전트
    │     PubMed·NEJM·국내 학회지 검색
    │     관련성 점수 기반 상위 10편 선별
    │
    ├── 📋 케이스요약 에이전트
    │     환자 EMR 데이터 → 타임라인 요약
    │     진단 과정·치료 결정 포인트 추출
    │
    └── 📊 슬라이드생성 에이전트
          케이스 + 문헌 → 구조화 슬라이드 초안
          발표 흐름 (배경→케이스→토론→결론)
```

## 실행 흐름

```
/conference-prep [케이스 ID or 주제]

Step 1: 케이스 요약 에이전트 → 환자 요약 2페이지
Step 2: 문헌검색 에이전트 → 관련 논문 5-10편 + 요약
Step 3: 슬라이드생성 에이전트 → 15-20슬라이드 초안
Step 4: 오케스트레이터 → 통합 검토 + 누락 확인
Step 5: 발표자 최종 검토 후 확정

예상 시간: 자동화 부분 45분 (사람 검토 제외)
```

## 적용 직종

- **의사·전공의** (케이스 발표, 콘퍼런스 진행)
- **관리자·파트장** (콘퍼런스 기획)

## 사용법

```bash
# Claude Code에서 이 파일 사용
/conference-prep --case="환자ID" --topic="AKI 감별진단"
```

## SNUHmate 연동

- 찾아보기 탭의 단협 규정 검색과 동일한 RAG 패턴 활용
- 연구지원 PII 마스킹 → B6 마스킹 패턴 병행

## 설치

```bash
/plugin install github:UltrasoundSonicBoom/snuhmate?path=packages/snuhmate-harness
```
