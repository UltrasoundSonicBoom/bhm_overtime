# SNUHmate 양식 디렉터리

생활이벤트 카드(`/app?tab=lifeEvent`)의 `documents_required[].url` 이 여기로 링크되도록 합의되어 있습니다.
Plan dazzling-booping-kettle Track B Stage 1 시점은 **외부 발급 링크(정부24·고용센터·근로복지공단·사학연금공단 등)** 로 위임하고, 이 디렉터리는 **placeholder** 로 유지됩니다.

## 양식을 추가하는 절차 (Stage 2 이후)

1. `apps/web/public/forms/` 에 PDF 또는 HWP 양식 파일 추가 (예: `청원휴가신청서.pdf`).
2. `apps/web/public/data/regulation-actions.json` 의 해당 event 의 `documents_required[].url` 을 `/forms/<filename>` 로 갱신.
3. `pnpm test:unit` — `tests/unit/life-event-actions.test.js` drift 통과 확인.
4. 커밋 메시지: `feat(forms): add <양식명> for <event_id>` 형식.

## Stage 1 외부 링크 의존 양식 목록

| 양식명 | 발급기관 | 외부 링크 |
|--------|---------|----------|
| 가족관계증명서 | 주민센터·정부24 | https://www.gov.kr/ |
| 사망진단서·매장(화장)증명서 | 병원·장례식장 | (기관 직접 발급) |
| 출생증명서·출생신고서 | 병원·주민센터 | https://www.gov.kr/ |
| 혼인관계증명서 | 주민센터·정부24 | https://www.gov.kr/ |
| 주민등록등본 | 주민센터·정부24 | https://www.gov.kr/ |
| 임신확인서 | 산부인과 | (기관 직접 발급) |
| 산재 요양 승인 통지서 | 근로복지공단 | https://www.comwel.or.kr/ |
| 사학연금 가입증명서 | 사학연금공단 | https://www.tp.or.kr/ |
| 고용보험 육아휴직급여 신청서 | 고용센터 | https://www.ei.go.kr/ |

## 인사팀 내부 양식 (placeholder — Stage 2 추가 예정)

- 청원휴가 신청서
- 산전후휴가 신청서
- 휴직 신청서 (육아·질병·공상·자기계발)
- 경조금 청구서
- 퇴직 신청서 (정년퇴직)
- 공로연수 옵션 통보서

각 양식은 SNUH 인사팀과 협의 후 PDF·HWP 본 디렉터리에 업로드하고 JSON 의 `url` 만 교체합니다.
