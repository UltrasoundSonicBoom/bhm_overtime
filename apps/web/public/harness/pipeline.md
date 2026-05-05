---
name: hospital-pipeline-automation
description: "병원 업무 파이프라인 자동화 AI 패턴. 입원 온보딩, 퇴원 계획, 수술 전 체크리스트, 직원 온보딩, 규정 업데이트 배포, 연구 데이터 전처리."
---

# 파이프라인 자동화 (Pipeline Automation) — 병원 AI 패턴

다단계 병원 업무 프로세스를 AI가 자동으로 조율·실행하는 오케스트레이션 패턴.

## 파이프라인 목록

```
환자 입원 온보딩:
  입원 접수 → 초기 평가 → 케어플랜 수립 → 팀 알림 발송
  ↳ 수속 45분 → 20분, 서류 누락 0건

퇴원 계획:
  퇴원 예고 → 요약 생성 → 안내문 발송 → 외래 예약
  ↳ 퇴원 당일 모든 절차 오전 내 완료

수술 전 체크리스트:
  환자 확인 → 동의서 확인 → 검사 완료 확인 → 팀 브리핑
  ↳ 수술 취소·지연 30% 감소

직원 온보딩:
  계정 생성 → 오리엔테이션 배정 → 멘토 매칭 → 교육 이수 추적
  ↳ 관리자 소요 시간 4시간 → 30분

규정 업데이트 배포:
  변경 감지 → 영향 분석 → 교육 자료 생성 → 전체 공지
  ↳ 법 시행 전 전 부서 배포 완료

연구 데이터 전처리:
  데이터 수집 → PII 마스킹 → 정제·검증 → 분석 준비
  ↳ 데이터 준비 2주 → 2일
```

## 적용 직종

- **간호사** (입원·퇴원 파이프라인)
- **의사·전공의** (수술·퇴원·연구)
- **행정사무직** (온보딩, 규정 배포)
- **관리자·파트장** (전 파이프라인 감독)

## Claude Code 구현 가이드

```python
# SNUHmate 파이프라인 패턴 (의사코드)

class HospitalPipeline:
    def __init__(self, steps: list[Step]):
        self.steps = steps
    
    async def run(self, context: dict) -> PipelineResult:
        for step in self.steps:
            try:
                context = await step.execute(context)
                await notify_completion(step.name, context)
            except StepError as e:
                await escalate(e, step.name)
                raise
        return PipelineResult(success=True, context=context)

# 사용 예:
admission_pipeline = HospitalPipeline([
    RegistrationStep(),
    InitialAssessmentStep(),
    CarePlanStep(),
    TeamNotificationStep()
])
```

## 주요 기술 스택

- **오케스트레이션**: Airflow (대규모) / 간단한 async Python
- **알림**: 병원 내부 메신저 / SMS / 이메일
- **EMR 연동**: HL7 FHIR
- **모니터링**: 각 단계 완료 상태 대시보드

## 오케스트레이터 + 에이전트 패턴 (SNUHmate 하네스)

각 파이프라인은 `smate-feature-ship` 오케스트레이터가 전문 에이전트(payroll-review, design-guard, b6-masking, pr-ops)를 조율해 실행한다.

## 설치 (SNUHmate 하네스 전체)

```bash
/plugin install github:UltrasoundSonicBoom/snuhmate?path=packages/snuhmate-harness
```
