---
name: hospital-capture-recognize
description: "병원 현장 촬영·음성 캡처 → 구조화 데이터 변환. 근무표 사진→캘린더, 상처 이미지→간호기록, 약봉지 스캔→복약지도, 장비 화면→검사수치, 음성 인수인계→SBAR."
---

# 촬영·인식 (Capture & Recognize) — 병원 AI 패턴

카메라·마이크로 수집된 비정형 데이터를 구조화된 의료 데이터로 변환하는 AI 패턴.

## 핵심 사용 시나리오

| 입력 | AI 처리 | 출력 |
|------|---------|------|
| 근무표 사진 (종이·모니터) | OCR + 교대패턴 인식 | 개인 캘린더 JSON |
| 상처·피부 사진 | 이미지 분석 + NLP | SOAP 간호기록 초안 |
| 약봉지 스캔 | 텍스트 추출 + 약물DB 조회 | 복약지도 안내문 |
| 장비 모니터 캡처 | 화면 OCR + 단위 정규화 | EMR 삽입용 수치 |
| 음성 인수인계 (1–3분) | STT + SBAR 분류 | 구조화 인수인계서 |

## 적용 직종

- **간호사** (병동·응급·외래 3교대)
- **의료기사·보건직** (검사 수치 입력, 장비 운용)

## Claude Code 구현 가이드

```
사용자: 근무표 이미지를 OCR로 처리해서 캘린더에 넣어줘

Claude 실행 흐름:
1. 이미지 수신 → vision API 호출 (GPT-4o / Claude 3.5)
2. 날짜·요일·교대기호 추출 (정규식 후처리)
3. iCal / JSON 포맷 변환
4. 캘린더 앱 API 또는 로컬 파일 저장
```

## 주요 기술 스택

- **OCR**: Tesseract (로컬) / AWS Textract (클라우드)
- **STT**: Whisper (로컬) / Clova Speech (한국어 특화)
- **이미지 분석**: Claude 3.5 Sonnet vision
- **SBAR 변환**: Prompt engineering + Few-shot examples

## 개인정보 고려사항

- 환자 사진 처리 시 로컬 우선 (서버 전송 전 동의 필수)
- 약봉지에 환자명 포함 → PII 마스킹 후 처리
- 처리 완료 후 임시 이미지 파일 즉시 삭제

## SNUHmate 연동

- B3 (근무표 자동화): 이 패턴으로 구현 예정
- 로컬 처리 원칙 준수 — `/smate-b6-masking` 참조

## 설치 (SNUHmate 하네스 전체)

```bash
/plugin install github:UltrasoundSonicBoom/bhm_overtime?path=packages/snuhmate-harness
```
