---
title: "AI가 만든 콘텐츠, AI가 평가한다 — 2-Tier Eval + Opik 도입 사례"
source: "https://www.gpters.org/dev/post/aiga-mandeun-kontenceu-aiga-pyeonggahanda----2-tier-eval-opik-doib-sarye-RkiLhydr3e4aHy2"
author: "null"
clipped_at: "2026-03-17T07:40:01Z"
word_count: 2088
method: "article-defuddle"
---

> GPTers 팀이 두 개의 AI 서비스(Rona, CurateBot)에 체계적인 AI 평가 시스템을 구축한 과정과 Opik을 활용한 관측성 확보 사례를 공유합니다.

## 왜 AI Evaluation이 필요했나

우리 팀은 두 개의 AI 서비스를 운영하고 있습니다.

- **Rona** — AI가 사용자의 업무 맥락을 분석해 맞춤형 코딩/자동화 실습을 생성하는 플랫폼
- **CurateBot(콕집이)** — RSS/X/YouTube에서 기술 콘텐츠를 수집하고, AI가 팀원별 맞춤 요약·분류·배분하는 내부 큐레이션 서비스

두 서비스 모두 **AI가 최종 아웃풋을 생성** 합니다. Rona는 실습 시나리오 전체를, CurateBot은 콘텐츠 요약과 메타데이터를 만듭니다. 문제는 \\"잘 만들었는지\\" 확인하는 것이 사람 눈에만 의존하고 있었다는 점입니다.

- 프롬프트를 바꿨는데 더 나아진 건지 확인할 방법이 없음
- 모델을 교체할 때 품질이 유지되는지 비교할 수 없음
- 운영 중 간헐적으로 발생하는 품질 저하를 사후에야 발견

**\\"AI 아웃풋의 품질을 정량적으로, 자동으로, 지속적으로 측정하자\\"** — 이것이 eval 시스템 도입의 출발점이었습니다.

### LLM-as-a-Judge: 연구 동향과 우리의 접근

LLM을 평가자로 사용하는 \\"LLM-as-a-Judge\\" 패러다임은 최근 활발히 연구되고 있습니다. [Gu et al. (2025)](https://arxiv.org/abs/2411.15594) 의 서베이는 신뢰할 수 있는 LLM-as-a-Judge 시스템 구축을 위한 일관성 향상 전략과 편향 완화 방법을 체계적으로 정리했고, [또 다른 서베이(2024)](https://arxiv.org/abs/2412.05579) 는 기능, 방법론, 응용, 메타평가, 한계의 5가지 관점에서 이 분야를 분석했습니다.

특히 주목한 트렌드는 **단일 LLM에서 다중 에이전트 패널로의 진화** 입니다. [Agent-as-a-Judge](https://arxiv.org/html/2508.02994v1) 연구에서는 도메인 전문가, 비평가, 옹호자 등 역할을 나눈 다중 에이전트가 협업·토론하여 평가하는 방식을 제안합니다.

또 하나의 핵심 이슈는 **Preference Leakage** 문제입니다. 데이터를 생성한 LLM과 평가하는 LLM 사이에 선호도가 유출(contamination)되어 평가가 오염될 수 있다는 연구 결과는, 우리가 실제로 겪은 self-grading bias와 정확히 일치합니다.

이런 연구 배경 위에서, 우리는 다음 best practices를 설계 원칙으로 삼았습니다:

원칙적용숫자 점수 전에 binary pass/fail부터Tier 1의 규칙은 모두 pass/fail → 이후 점수화1-5 정수 스케일 사용Tier 2는 1-5 정수 (Rona) / 0.0-1.0 (CurateBot)단일 기준씩 분리 평가차원별 독립 GEval (analogy\_quality, story\_coherence 등)A/B 비교 시 순서 교대매트릭스 실험으로 gen×eval 모든 조합 테스트전문가 라벨 캘리브레이션골든 데이터셋 (정적 시나리오 + DB 임포트)CoT로 판단 근거 생성GEval의 rationale 필드로 평가 근거 추적시간 경과에 따른 anomaly detection온라인 eval hook으로 연속 모니터링

---

## 설계 원칙: 2-Tier Architecture

두 서비스 모두 동일한 아키텍처 원칙을 따릅니다.

Tier 1 (규칙 기반)Tier 2 (LLM-as-Judge)비용$0API 호출 비용속도~2ms~3-10초특성결정론적확률론적방식JSON 스키마 검증, 통계 검사, 패턴 매칭GEval 프레임워크, 차원별 점수+근거

**Tier 1 (규칙 기반)**: 빠르게 \\"명백한 실패\\"를 걸러냅니다. 비용 제로, 2ms 이내.

**Tier 2 (LLM-as-Judge)**: 사람이 판단하는 것과 유사한 주관적 품질 차원을 LLM에게 평가시킵니다.

이 2-tier 구조를 선택한 이유:

1. **비용 효율** — Tier 1만으로 걸러지는 케이스에는 LLM 비용이 0
2. **속도** — 온라인(실시간) eval에서는 Tier 1만 실행하고, Tier 2는 배치로 실행
3. **결합** — 규칙으로 잡을 수 있는 건 규칙으로, 주관적 판단이 필요한 건 LLM으로

---

## Rona: 실습 생성 품질 평가

### Tier 1 — 14개 규칙, 3단계 심각도

Rona의 실습은 복잡한 구조체입니다. title, description, greeting, steps(각각 learner\_action, concept\_block, evaluation\_criteria 등 포함), wrap\_up, achievements 등 수십 개 필드로 구성됩니다. 이 구조의 완전성과 품질을 14개 규칙으로 검증합니다.

```
// scripts/eval/rules/index.ts — 14개 규칙, severity 3단계\n\nconst ALL_RULES: RuleEntry[] = [\n  // Critical (실패 시 즉시 불합격)\n  { name: \"structural\",  fn: structuralRule,  severity: \"critical\" },\n  { name: \"sufficiency\",  fn: sufficiencyRule, severity: \"critical\" },\n  { name: \"learner_action\", fn: learnerActionRule, severity: \"critical\" },\n\n  // Warning (2개까지 허용)\n  { name: \"density\",     fn: densityRule,     severity: \"warning\" },\n  { name: \"concept_quiz\", fn: conceptQuizRule, severity: \"warning\" },\n  { name: \"interaction-decision\", ... severity: \"warning\" },\n  { name: \"interaction-coaching\", ... severity: \"warning\" },\n  { name: \"interaction-direction\", ... severity: \"warning\" },\n  { name: \"time_realism\", ... severity: \"warning\" },\n  { name: \"step_progression\", ... severity: \"warning\" },\n  { name: \"achievement_alignment\", ... severity: \"warning\" },\n\n  // Info (참고용)\n  { name: \"terminology\", ... severity: \"info\" },\n  { name: \"company_app\", ... severity: \"info\" },\n  { name: \"tools_alignment\", ... severity: \"info\" },\n];\n\n// 합격 조건: Critical 0개 AND Warning <= 2개\nconst pass = !hasCritical && failedWarnings.length <= 2;
```

특히 **인터랙션 품질 규칙** 3개가 흥미로운데, AI가 생성한 실습에서 \\"답정너\\" 패턴을 자동 감지합니다:

규칙감지 대상예시interaction-decision수동적 프롬프트, 이진 선택지\\"준비되셨나요?\\" → 네/아니요interaction-coaching일방적 지시 대신 코칭 패턴답을 알려주기 vs 질문으로 유도interaction-direction평가 기준의 폐쇄형 질문정답을 노출하는 evaluation\_criteria

### Tier 2 — 크로스 모델 패널 평가

Rona의 Tier 2는 단순히 하나의 LLM에게 평가를 맡기지 않습니다. **여러 평가 모델의 합의(panel consensus)** 를 활용합니다.

**기본 패널**: Claude Sonnet + Gemini Pro + GPT-4.1-mini → 차원별 점수 → 합의 지표 계산

**3개 평가 차원** (Slim 모드):

차원평가 대상스케일analogy\_qualityconcept\_block의 비유가 비개발자에게도 명확한가1-5story\_coherencegreeting~wrap\_up까지 스토리라인이 일관되는가1-5difficulty\_fit표기된 난이도와 실제 복잡도가 맞는가1-5

패널 합의 계산:

```
// 차원별 spread = max - min (평가자 간 의견 차이)\n// agreement = max(0, 1 - avg_spread)\n// agreement가 높을수록 평가 신뢰도 UP\n\n// 예: analogy_quality 점수가 [4, 3, 4]라면\n//     spread = 1, agreement = 1 - 0.33 = 0.67 (높은 합의)
```

**왜 패널인가?** 초기에 Claude만으로 평가했을 때, 자기가 만든 실습을 자기가 평가하면 점수가 부풀려지는 **self-grading bias** 를 발견했습니다. 이는 Preference Leakage 연구와 정확히 일치하는 현상입니다. 다른 모델 패밀리의 모델을 함께 사용하면 이 편향이 완화됩니다.

### Model Registry — 7개 모델 매트릭스

Rona의 eval 스크립트는 **생성 모델 x 평가 모델** 조합을 매트릭스로 실행할 수 있습니다.

```
# 단일 조합\nnpx tsx scripts/opik-eval.ts --run --gen-model gemini-pro --eval-model claude-sonnet --tier2\n\n# 전체 매트릭스 (모든 gen x eval 조합)\nnpx tsx scripts/opik-eval.ts --run --tier2 --matrix
```

ProviderGenerationEvaluationGoogleGemini 3.1 Pro, Gemini 3 FlashOAnthropicClaude Sonnet 4.6, Claude Opus 4.6+ Haiku 4.5OpenAIGPT-4.1, GPT-4.1-mini, o3-miniO

---

## CurateBot: 콘텐츠 품질 평가

### Tier 1 — 통계 기반 검증

CurateBot의 AI 아웃풋은 크게 두 가지: **요약** 과 **메타데이터** (카테고리, 난이도, 키워드).

**요약 품질 Tier 1**:

```
class SummaryLengthMetric {\n  // 50~2000자 범위 검증\n  score(input) {\n    const len = input.expected.length;\n    const pass = len >= 50 && len <= 2000;\n    return { value: pass ? Math.min(1, len / 200) : 0 };\n  }\n}\n\nclass CompressionRatioMetric {\n  // 원문 대비 압축률 3~50% (목표 15%)\n  score(input) {\n    const ratio = summaryLen / originalLen;\n    const pass = ratio >= 0.03 && ratio <= 0.5;\n    return { value: pass ? 1 - Math.abs(ratio - 0.15) : 0 };\n  }\n}
```

**메타데이터 Tier 1**:

메트릭검증 내용MetadataCompletenesscategory, difficulty, keywords 3개 필드 존재 여부CategoryValidity7개 유효 카테고리 중 하나인지 (tech, marketing, business,...)DifficultyValidityL1~L4 유효 난이도인지

### Tier 2 — GEval LLM-as-Judge

**요약 품질 3차원** (Gemini Flash 평가):

차원평가 기준스케일factual\_accuracy원문 대비 사실 왜곡·환각 여부0.0-1.0key\_coverage핵심 포인트 포착률0.0-1.0conciseness불필요한 반복 없이 간결한가0.0-1.0

**메타데이터 교차 검증 2차원**:

차원평가 기준category\_accuracy콘텐츠 내용 대비 카테고리 분류 적절성difficulty\_accuracy전문 용어 밀도·배경지식 요구 수준 대비 난이도 적절성

### Online Eval — Fire-and-Forget 패턴

CurateBot은 콘텐츠가 처리될 때마다 Tier 1 평가를 **비동기로** 실행합니다. 사용자 경험에 영향을 주지 않으면서 품질 데이터를 축적합니다.

**흐름**: 콘텐츠 수집/요약 → 결과 반환(지연 없음) → fire-and-forget으로 eval 실행(백그라운드, Opik에 기록)

4개의 온라인 eval hook이 콘텐츠 파이프라인 곳곳에 삽입되어 있습니다:

- `evalSummaryQuality` — 요약 생성 직후
- `evalMetadataQuality` — 메타데이터 태깅 직후
- `evalContentQuality` — 콘텐츠 전반 품질
- `evalDistributionQuality` — 사용자별 배분 품질

---

## Opik 통합: 왜, 어떻게

### 왜 Opik인가

eval 시스템을 만들었지만, 결과를 **축적하고 비교하는** 인프라가 필요했습니다. Opik은 다음을 제공합니다:

1. **Trace/Span 구조** — AI 파이프라인의 각 단계를 구조화된 로그로 기록
2. **Experiment** — 동일 데이터셋에 대해 다른 설정으로 반복 실행하고 결과 비교
3. **GEval** — LLM-as-Judge를 위한 내장 프레임워크
4. **Dataset** — 골든 테스트셋 관리
5. **대시보드** — 실험 결과 시각화, 차원별 점수 분포 확인

### 통합 패턴 1: Singleton Client + Graceful Degradation

두 서비스 모두 **OPIK\_API\_KEY가 없으면 아무 일도 일어나지 않는** 패턴을 사용합니다.

```
// Rona — src/lib/ai/tracing.ts\nlet opikClient: OpikInstance | null | undefined;\n\nfunction getClient(): OpikInstance | null {\n  if (opikClient !== undefined) return opikClient;\n  const apiKey = process.env.OPIK_API_KEY;\n  if (!apiKey) { opikClient = null; return null; }\n  try {\n    const { Opik } = require(\"opik\");\n    opikClient = new Opik({ apiKey, projectName: \"rona-practice\" });\n    return opikClient;\n  } catch {\n    opikClient = null; // 초기화 실패해도 서비스 중단 없음\n    return null;\n  }\n}
```

```
// CurateBot — scripts/eval/opik-client.ts\nexport function getTrackedGemini(traceName?: string) {\n  const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });\n  const opik = getOpikClient();\n  if (!opik) {\n    return { genAI, tracked: false, flush: async () => {} };\n  }\n  // opik-gemini 패키지로 자동 트레이싱 래핑\n  const trackedGenAI = trackGemini(genAI, {\n    traceMetadata: { tags: ['eval', traceName || 'curatebot-eval'] },\n  });\n  return { genAI: trackedGenAI, tracked: true, flush: async () => trackedGenAI.flush() };\n}
```

**핵심**: 관측성은 항상 opt-in입니다. API 키가 없거나 Opik 서버에 문제가 있어도 서비스 자체는 정상 동작합니다.

### 통합 패턴 2: Trace/Span으로 파이프라인 관측

Rona의 실습 생성은 여러 단계를 거칩니다. 각 단계를 Opik span으로 기록합니다.

```
const trace = client.trace({\n  name: \`generate:${title}\`,\n  metadata: { models, source, totalElapsedMs },\n  tags: [\`level:${userLevel}\`, \`source:${source}\`],\n});\n\ntrace.span({ name: \"welfare-engine\" }).end();  // 복리엔진 API\ntrace.span({ name: \"tool-docs\" }).end();       // 도구 문서 조회\ntrace.span({ name: \"profile-lookup\" }).end();  // 사용자 프로필\ntrace.span({ name: \"stage1\", model: \"gemini-pro\" }).end();\ntrace.span({ name: \"density-check\" }).end();   // 인터랙션 밀도\ntrace.span({ name: \"stage2\", model: \"gemini-flash\" }).end();\ntrace.span({ name: \"validation\" }).end();      // 최종 검증\n\ntrace.end();\nclient.flush().catch(() => {}); // fire-and-forget
```

### 통합 패턴 3: Opik Experiment로 체계적 비교

```
// Rona\nconst result = await evaluate({\n  dataset,              // 골든 시나리오 (11 정적 + 30 DB)\n  task: generateAndEvalTask,\n  scoringMetrics: [\n    new StructuralMetric(),\n    new SufficiencyMetric(),\n    new DensityMetric(),\n    new InteractionQualityMetric(),\n    new Tier1OverallMetric(),\n    ...tier2GEvalMetrics,  // Tier 2 패널 평가\n  ],\n  experimentName: \`rona_${genModel}_eval-by_${evalModel}\`,\n});
```

```
// CurateBot\nconst result = await evaluate({\n  dataset,              // DB에서 랜덤 샘플링 30건\n  task: createSummaryTask(),\n  scoringMetrics: [\n    new SummaryLengthMetric(),\n    new CompressionRatioMetric(),\n    ...tier2GEvalMetrics,  // factual_accuracy, key_coverage, conciseness\n  ],\n  experimentName: \`summary_tier1+tier2_${timestamp}\`,\n});
```

**차이점**: Rona는 실습을 새로 생성(generation + evaluation)하고, CurateBot은 이미 생성된 요약을 평가(evaluation only)합니다.

---

## 운영 경험에서 얻은 교훈

### 1\. Self-Grading Bias(Preference Leakage)는 실재한다

같은 모델 패밀리(예: Gemini Pro로 생성 → Gemini Flash로 평가)를 사용하면 점수가 0.3~0.5점 높게 나옵니다. **대응**: 다른 모델 패밀리로 교차 평가. Rona의 3-모델 패널이 이 문제에 대한 실용적 해답입니다.

### 2\. 규칙 기반이 생각보다 강력하다

Tier 1 규칙만으로 전체 품질 문제의 ~70%를 잡아냅니다. 비용 $0, 속도 2ms, 결정론적. **binary pass/fail부터 시작하라** 는 best practice와도 부합합니다.

### 3\. 차원 분리 평가가 정확하다

\\"전반적으로 잘 만들었나요?\\"보다 \\"비유가 명확한가?\\" \\"난이도가 맞는가?\\"처럼 **단일 기준씩 분리 평가** 하는 것이 훨씬 신뢰도가 높습니다. CoT로 판단 근거를 생성하면 신뢰도가 10-15% 향상됩니다.

### 4\. Fire-and-Forget 패턴이 핵심이다

eval이 사용자 경험을 방해하면 안 됩니다. 개별 점수의 정밀도보다 추세(trend)가 중요합니다.

### 5\. 골든 데이터셋은 \\"정적 + 동적\\" 조합이 좋다

정적 시나리오는 회귀 테스트, 동적 샘플링은 실제 운영 데이터 분포 반영. **30-50개 전문가 라벨 캘리브레이션 셋** 의 역할을 수행합니다.

### 6\. 메타평가(Meta-evaluation)를 잊지 말 것

judge 자체의 성능도 평가해야 합니다. Rona의 매트릭스 실험(gen-model x eval-model)은 사실상 메타평가를 수행합니다.

---

## 기술 스택 요약

구성 요소RonaCurateBotAI 모델Gemini (생성) + 멀티 모델 (평가)Gemini (생성 + 평가)Tier 1 규칙 수14개 (3 critical, 8 warning, 3 info)5개 (통계 + 유효성)Tier 2 차원 수3개 (slim) / 5개 (deep)3개 (요약) + 2개 (메타데이터)평가 모델패널 (Sonnet + Gemini + GPT)Gemini Flash 단독골든 데이터셋11 정적 + 30 DB 임포트DB 랜덤 샘플링 30건온라인 EvalTier 1 (생성 시 자동)4개 hook (파이프라인 내 자동)

---

## 시작하려면

1. **Tier 1부터 시작하세요** — 규칙 3~5개만 만들어도 즉시 가치를 느낄 수 있습니다.
2. **Opik을 연결하세요** — `opik` 패키지 + API 키 하나면 됩니다.
3. **골든 데이터셋을 만드세요** — 5~10개의 대표 케이스면 충분합니다.
4. **Tier 2는 필요할 때 추가하세요** — 가능하면 여러 모델의 패널로 평가하세요.

```
npm install opik opik-gemini
```

```
import { Opik, evaluate, GEval } from 'opik';\n\nconst opik = new Opik({ apiKey: process.env.OPIK_API_KEY });\nconst dataset = await opik.getOrCreateDataset('my-golden-set');\n\nawait evaluate({\n  dataset,\n  task: myAiTask,\n  scoringMetrics: [\n    myTier1Rule,\n    new GEval({\n      name: 'quality',\n      taskIntroduction: '평가 대상 설명...',\n      evaluationCriteria: '평가 기준...',\n    }),\n  ],\n});
```

---

## 더 알아보기: 관련 리소스

### 학술 연구

- [Gu et al. (2025)](https://arxiv.org/abs/2411.15594) — 신뢰할 수 있는 LLM-as-a-Judge 시스템 구축 서베이
- [LLMs-as-Judges 종합 서베이 (2024)](https://arxiv.org/abs/2412.05579) — 5가지 관점 분석 ([GitHub](https://github.com/CSHaitao/Awesome-LLMs-as-Judges))
- [Agent-as-a-Judge (2025)](https://arxiv.org/html/2508.02994v1) — 다중 에이전트 평가 패러다임
- [Judge's Verdict Benchmark](https://openreview.net/forum?id=jVyUlri4Rw) — 54개 LLM 판단 능력 벤치마킹

### 프레임워크 & 도구

- [Opik](https://www.comet.com/opik) — LLM 관측성 + eval 플랫폼
- [Ragas](https://docs.ragas.io/) — RAG/에이전트 평가 프레임워크
- [Promptfoo](https://www.promptfoo.dev/) — 프롬프트 테스트 + LLM-as-a-Judge
- [Langfuse](https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge) — LLM-as-a-Judge 가이드
- [Judge Arena](https://huggingface.co/spaces/AtlaAI/judge-arena) — 평가 모델 성능 순위

### 학습 자료

- [Evidently AI — LLM-as-a-Judge 완전 가이드](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [Hugging Face Cookbook — LLM Judge 구현](https://huggingface.co/learn/cookbook/en/llm_judge)

---

## 다음 단계: 더 잘 활용하기 위해

2-Tier Eval + Opik 인프라를 깔았으니, 이제는 이 위에서 **실질적인 품질 개선 루프** 를 돌리는 단계입니다.

### Eval-Driven Development로 전환

- **프롬프트 변경 시 자동 eval**: PR에 프롬프트 파일이 포함되면 CI에서 Tier 1 자동 실행
- **A/B 프롬프트 비교 자동화**: 매트릭스 실험을 PR 단위로 자동 트리거
- **Regression Guard**: 점수가 이전 배포 대비 N% 이상 하락하면 배포 차단

### 평가자 품질 개선

- **평가 전용 모델 도입**: [Judge Arena](https://huggingface.co/spaces/AtlaAI/judge-arena) 리더보드 기반 후보 선정
- **인간 라벨과의 캘리브레이션**: 전문가 30-50건 → 불일치 20% 이상이면 프롬프트 재설계
- **메타평가 파이프라인**: judge 성능을 정기 벤치마킹

### Opik 대시보드 활용 고도화

- **Anomaly Detection 알림**: 이동 평균 대비 2sigma 이상 벗어나면 Slack 알림
- **코스트-퀄리티 트레이드오프**: 비용 대비 품질 시각화
- **통합 대시보드**: Rona + CurateBot eval 추세를 한곳에서 모니터링

### 사용자 피드백 루프 연결

- **Rona**: 실습 완료율, 중도 이탈 스텝, devlog 제출률을 eval 점수와 매칭
- **CurateBot**: Slack 반응(읽음, 클릭, 피드백)을 eval 점수와 매칭
- 상관이 낮은 차원은 폐기, 실제 행동과 상관 높은 새 차원 추가

**규칙으로 잡을 수 있는 건 규칙으로, 주관적 판단이 필요한 건 교차 검증으로, 최종 검증은 사용자 행동 데이터로** — 이 3단계를 갖추면 eval이 단순한 품질 체크를 넘어 제품 개선의 엔진이 됩니다.
